import type { AudioProcessorOptions, LocalTrack, TrackProcessor } from 'livekit-client';
import { Track } from 'livekit-client';

/**
 * Гейн-процессор микрофона, реализованный как штатный LiveKit TrackProcessor (тот же
 * механизм, на котором построены Krisp/virtual background), а не как самодельная подмена
 * трека через replaceTrack().
 *
 * Почему это важно: LocalTrack.setMediaStreamTrack() (вызывается при mute/unmute-триггерном
 * restart(), смене устройства и т.п.) САМ вызывает `processor.restart({ track: newTrack })`
 * при каждой замене реального MediaStreamTrack. Это устраняет целый класс багов "граф
 * держит ссылку на протухший источник" — раньше при любой пересборке трека где-то ещё в
 * коде наш Web Audio граф просто не узнавал об этом.
 *
 * Второй эшелон защиты — вотчдог: сравнение RMS на входе (до GainNode) и на выходе (после)
 * каждые WATCHDOG_INTERVAL_MS. Известный баг браузеров (WebKit bug 276687 и аналогичные в
 * Chromium): при сворачивании вкладки/энергосбережении рендер-тред AudioContext может
 * фактически остановиться, при этом ctx.state продолжает репортить "running" — проверка
 * одного ctx.state недостаточна. Если источник явно активен (человек говорит), а выход
 * графа тихий несколько тиков подряд — граф считается зависшим:
 *   1) пробуем ctx.suspend()+ctx.resume() (простого resume() часто недостаточно, если
 *      currentTime фактически не растёт) и пересобираем граф на том же треке;
 *   2) если это не помогает MAX_REBUILD_ATTEMPTS раз — гарантированно откатываемся на
 *      сырой трек (звук важнее точной громкости) и не трогаем аудио, пока вкладка не
 *      вернётся в фокус (visibilitychange), после чего пробуем восстановить обработку.
 */

const WATCHDOG_INTERVAL_MS = 2000;
const MAX_REBUILD_ATTEMPTS = 3;
/** RMS (0..1) выше которого считаем, что на входе реально есть живой сигнал (речь). */
const ACTIVE_RMS_THRESHOLD = 0.02;
/** RMS (0..1) ниже которого считаем выход графа тишиной. */
const SILENCE_RMS_THRESHOLD = 0.01;
/** Сколько тиков подряд должен наблюдаться "активный вход + тихий выход", прежде чем
 * считать граф зависшим (не реагируем на одну паузу в речи). */
const STUCK_TICKS_THRESHOLD = 2;

function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}

function rms(data: Uint8Array): number {
  let sum = 0;
  for (let i = 0; i < data.length; i++) {
    const v = (data[i] - 128) / 128;
    sum += v * v;
  }
  return Math.sqrt(sum / data.length);
}

type GainGraph = {
  source: MediaStreamAudioSourceNode;
  gain: GainNode;
  dest: MediaStreamAudioDestinationNode;
  destTrack: MediaStreamTrack;
  inputAnalyser: AnalyserNode;
  outputAnalyser: AnalyserNode;
};

export class MicrophoneGainProcessor implements TrackProcessor<
  Track.Kind.Audio,
  AudioProcessorOptions
> {
  name = 'xi-microphone-gain';
  processedTrack?: MediaStreamTrack;

  private ctx?: AudioContext;
  private localTrack?: LocalTrack;
  private graph: GainGraph | null = null;
  private hardwareTrack?: MediaStreamTrack;
  private getVolume: () => number;
  private onBypassChange?: (bypassed: boolean) => void;
  private bypassed = false;
  private watchdogTimer?: ReturnType<typeof setInterval>;
  private stuckTicks = 0;
  private rebuildAttempts = 0;
  private recovering = false;

  constructor(getVolume: () => number, onBypassChange?: (bypassed: boolean) => void) {
    this.getVolume = getVolume;
    this.onBypassChange = onBypassChange;
  }

  async init(opts: AudioProcessorOptions) {
    this.ctx = opts.audioContext;
    this.localTrack = opts.localTrack;
    this.rebuildAttempts = 0;
    this.stuckTicks = 0;
    this.setup(opts.track);
    this.startWatchdog();
  }

  /** LiveKit вызывает это при КАЖДОЙ замене реального MediaStreamTrack (restart, смена
   * устройства, mute/unmute-триггерный reacquire) — граф пересобирается сам, без внешнего
   * наблюдения за этим со стороны React-хука. */
  async restart(opts: AudioProcessorOptions) {
    this.ctx = opts.audioContext;
    this.localTrack = opts.localTrack;
    this.stuckTicks = 0;
    if (!this.bypassed) {
      this.rebuildAttempts = 0;
    }
    this.setup(opts.track);
  }

  async destroy() {
    this.stopWatchdog();
    this.teardownGraph();
    // ctx общий (LiveKit/Room владеет им) — не закрываем
  }

  setVolume(volume: number) {
    const g = this.graph;
    if (!g || !this.ctx) return;
    g.gain.gain.setTargetAtTime(clamp01(volume), this.ctx.currentTime, 0.02);
  }

  private setup(track: MediaStreamTrack) {
    this.teardownGraph();
    this.hardwareTrack = track;

    if (this.bypassed || !this.ctx) {
      this.processedTrack = track;
      return;
    }

    try {
      const ctx = this.ctx;
      const source = ctx.createMediaStreamSource(new MediaStream([track]));
      const gain = ctx.createGain();
      gain.gain.value = clamp01(this.getVolume());
      const dest = ctx.createMediaStreamDestination();
      const inputAnalyser = ctx.createAnalyser();
      inputAnalyser.fftSize = 512;
      inputAnalyser.smoothingTimeConstant = 0;
      const outputAnalyser = ctx.createAnalyser();
      outputAnalyser.fftSize = 512;
      outputAnalyser.smoothingTimeConstant = 0;

      source.connect(gain);
      source.connect(inputAnalyser);
      gain.connect(dest);
      gain.connect(outputAnalyser);

      const destTrack = dest.stream.getAudioTracks()[0];
      if (!destTrack) {
        this.processedTrack = track;
        return;
      }

      this.graph = { source, gain, dest, destTrack, inputAnalyser, outputAnalyser };
      this.processedTrack = destTrack;
    } catch (error) {
      console.error('MicrophoneGainProcessor: failed to build gain graph, using raw track', error);
      this.processedTrack = track;
    }
  }

  /**
   * LiveKit сам переставляет processedTrack на sender после init()/restart() (см.
   * setProcessor()/setMediaStreamTrack() в LocalTrack). Но при пересборке графа по
   * инициативе вотчдога (recover()) или при восстановлении после visibilitychange
   * никто извне это не сделает — поэтому дублируем replaceTrack здесь. Двойной вызов
   * с тем же треком в остальных случаях безвреден (идемпотентен).
   */
  private pushToSender() {
    const sender = this.localTrack?.sender;
    if (!sender || !this.processedTrack) return;
    sender.replaceTrack(this.processedTrack).catch((error) => {
      console.error('MicrophoneGainProcessor: failed to push processed track to sender', error);
    });
  }

  private teardownGraph() {
    const g = this.graph;
    this.graph = null;
    if (!g) return;
    try {
      g.source.disconnect();
    } catch {
      /* ignore */
    }
    try {
      g.gain.disconnect();
    } catch {
      /* ignore */
    }
    try {
      g.inputAnalyser.disconnect();
    } catch {
      /* ignore */
    }
    try {
      g.outputAnalyser.disconnect();
    } catch {
      /* ignore */
    }
    try {
      g.destTrack.stop();
    } catch {
      /* ignore */
    }
  }

  private startWatchdog() {
    this.stopWatchdog();
    this.watchdogTimer = setInterval(() => this.checkHealth(), WATCHDOG_INTERVAL_MS);
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this.handleVisibilityChange);
    }
  }

  private stopWatchdog() {
    if (this.watchdogTimer) {
      clearInterval(this.watchdogTimer);
      this.watchdogTimer = undefined;
    }
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    }
  }

  private handleVisibilityChange = () => {
    if (document.visibilityState !== 'visible' || !this.bypassed) return;
    // Вкладка вернулась в фокус — даём обработке громкости ещё один шанс.
    this.bypassed = false;
    this.rebuildAttempts = 0;
    this.stuckTicks = 0;
    if (this.hardwareTrack) {
      this.setup(this.hardwareTrack);
      this.pushToSender();
    }
    this.onBypassChange?.(false);
  };

  private checkHealth() {
    if (this.bypassed || this.recovering || !this.graph) return;

    const { inputAnalyser, outputAnalyser } = this.graph;
    const inputData = new Uint8Array(inputAnalyser.frequencyBinCount);
    const outputData = new Uint8Array(outputAnalyser.frequencyBinCount);
    inputAnalyser.getByteTimeDomainData(inputData);
    outputAnalyser.getByteTimeDomainData(outputData);

    const sourceIsActive = rms(inputData) > ACTIVE_RMS_THRESHOLD;
    const outputIsSilent = rms(outputData) < SILENCE_RMS_THRESHOLD;

    if (sourceIsActive && outputIsSilent) {
      this.stuckTicks += 1;
    } else {
      this.stuckTicks = 0;
    }

    if (this.stuckTicks >= STUCK_TICKS_THRESHOLD) {
      this.stuckTicks = 0;
      void this.recover();
    }
  }

  private async recover() {
    this.recovering = true;
    this.rebuildAttempts += 1;
    console.warn(
      `MicrophoneGainProcessor: обработанный трек молчит при активном источнике — попытка восстановления #${this.rebuildAttempts}`,
    );

    if (this.rebuildAttempts > MAX_REBUILD_ATTEMPTS) {
      console.error(
        'MicrophoneGainProcessor: восстановить граф не удалось, откатываемся на сырой трек до возврата вкладки в фокус',
      );
      this.bypassed = true;
      this.teardownGraph();
      if (this.hardwareTrack) {
        this.processedTrack = this.hardwareTrack;
      }
      this.pushToSender();
      this.onBypassChange?.(true);
      this.recovering = false;
      return;
    }

    try {
      // Известный баг браузеров: ctx.state репортит "running", но рендер-тред фактически
      // остановлен (currentTime не растёт) — простого resume() часто недостаточно, помогает
      // цикл suspend()+resume(), пересоздающий аппаратный рендеринг.
      if (this.ctx) {
        await this.ctx.suspend();
        await this.ctx.resume();
      }
    } catch {
      /* ignore */
    }

    if (this.hardwareTrack) {
      this.setup(this.hardwareTrack);
      this.pushToSender();
    }
    this.recovering = false;
  }
}
