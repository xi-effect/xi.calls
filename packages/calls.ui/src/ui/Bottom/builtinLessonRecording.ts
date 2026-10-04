import { useCallback, useEffect, useRef, useState } from 'react';
import {
  useConferenceAudioSources,
  usePublishLessonRecording,
  type ConferenceAudioSourceT,
} from '@xipkg/calls-hooks';

type Phase = 'idle' | 'starting' | 'recording' | 'stopping';

class RecordingMixer {
  private readonly context: AudioContext;
  private readonly destination: MediaStreamAudioDestinationNode;
  private readonly nodes = new Map<string, MediaStreamAudioSourceNode>();
  private readonly keepAlive: AudioScheduledSourceNode;

  constructor() {
    const Ctx = window.AudioContext;
    if (!Ctx) throw new Error('AudioContext is not available');
    this.context = new Ctx();
    this.destination = this.context.createMediaStreamDestination();
    const gain = this.context.createGain();
    gain.gain.value = 0;
    gain.connect(this.destination);
    this.keepAlive = this.context.createConstantSource?.() ?? this.context.createOscillator();
    this.keepAlive.connect(gain);
    this.keepAlive.start();
  }

  get isRunning(): boolean {
    return this.context.state === 'running';
  }

  get audioTrack(): MediaStreamTrack {
    const [track] = this.destination.stream.getAudioTracks();
    if (!track) throw new Error('Audio mixer has no destination track');
    return track;
  }

  resume(): Promise<void> {
    if (this.context.state !== 'suspended') return Promise.resolve();
    return this.context.resume().then(() => undefined);
  }

  sync(sources: ConferenceAudioSourceT[]): void {
    const next = new Set(sources.map((source) => source.id));
    for (const [id, node] of this.nodes) {
      if (next.has(id)) continue;
      node.disconnect();
      this.nodes.delete(id);
    }
    for (const source of sources) {
      if (this.nodes.has(source.id) || source.track.readyState === 'ended') continue;
      const node = this.context.createMediaStreamSource(new MediaStream([source.track]));
      node.connect(this.destination);
      this.nodes.set(source.id, node);
    }
  }

  async close(): Promise<void> {
    for (const node of this.nodes.values()) node.disconnect();
    this.nodes.clear();
    try {
      this.keepAlive.stop();
    } catch {
      // Контекст уже закрыт.
    }
    this.destination.stream.getTracks().forEach((track) => track.stop());
    await this.context.close().catch(() => undefined);
  }
}

function recordingMime(): string {
  const candidates = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
  return candidates.find((mime) => MediaRecorder.isTypeSupported(mime)) ?? '';
}

function fileName(extension: string): string {
  const date = new Date();
  const pad = (value: number) => String(value).padStart(2, '0');
  return `Sovlium lesson ${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()} ${pad(date.getHours())}-${pad(date.getMinutes())}.${extension}`;
}

function waitForFrames(track: MediaStreamTrack): Promise<void> {
  if (track.readyState === 'ended') return Promise.reject(new Error('capture ended'));
  if (!track.muted) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const finish = (error?: Error) => {
      window.clearTimeout(timer);
      track.removeEventListener('unmute', onUnmute);
      track.removeEventListener('ended', onEnded);
      if (error) reject(error);
      else resolve();
    };
    const onUnmute = () => finish();
    const onEnded = () => finish(new Error('capture ended'));
    const timer = window.setTimeout(() => finish(), 2000);
    track.addEventListener('unmute', onUnmute);
    track.addEventListener('ended', onEnded);
  });
}

function download(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  anchor.style.display = 'none';
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/** Запись вкладки в самом xi.calls, когда хост не подставил свой рекордер. */
export function useBuiltinLessonRecording(active: boolean) {
  const publish = usePublishLessonRecording();
  const audio = useConferenceAudioSources();
  const audioRef = useRef(audio);
  audioRef.current = audio;
  const [phase, setPhase] = useState<Phase>('idle');
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const phaseRef = useRef<Phase>('idle');
  const mixerRef = useRef<RecordingMixer | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const videoRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    mixerRef.current?.sync(audio.sources);
  }, [audio.sources]);

  const stop = useCallback(async () => {
    const recorder = recorderRef.current;
    if (!recorder || phaseRef.current === 'stopping' || phaseRef.current === 'idle') return;
    phaseRef.current = 'stopping';
    setPhase('stopping');
    publish(false, null);
    const chunks = chunksRef.current;
    await new Promise<void>((resolve) => {
      recorder.addEventListener('stop', () => resolve(), { once: true });
      try {
        if (recorder.state === 'recording') recorder.requestData();
        recorder.stop();
      } catch {
        resolve();
      }
    });
    const blob = new Blob(chunks, { type: chunks[0]?.type || 'video/webm' });
    if (blob.size > 0) download(blob, fileName(blob.type.includes('mp4') ? 'mp4' : 'webm'));
    videoRef.current?.getTracks().forEach((track) => track.stop());
    videoRef.current = null;
    recorderRef.current = null;
    chunksRef.current = [];
    await mixerRef.current?.close();
    mixerRef.current = null;
    setStartedAt(null);
    phaseRef.current = 'idle';
    setPhase('idle');
  }, [publish]);

  const start = useCallback(() => {
    if (!active || phaseRef.current !== 'idle') return;
    phaseRef.current = 'starting';
    setPhase('starting');
    const mixer = new RecordingMixer();
    mixerRef.current = mixer;
    void mixer.resume();

    void (async () => {
      try {
        const ratio = window.devicePixelRatio || 1;
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            frameRate: { ideal: 60 },
            width: { ideal: Math.round(window.screen.width * ratio) },
            height: { ideal: Math.round(window.screen.height * ratio) },
            displaySurface: 'browser',
          },
          audio: false,
          preferCurrentTab: true,
          selfBrowserSurface: 'include',
          monitorTypeSurfaces: 'exclude',
        } as DisplayMediaStreamOptions);
        const [video] = stream.getVideoTracks();
        if (!video || video.getSettings().displaySurface === 'monitor') {
          stream.getTracks().forEach((track) => track.stop());
          throw new Error('capture rejected');
        }
        video.contentHint = 'detail';
        await waitForFrames(video);
        videoRef.current = stream;
        await mixer.resume();
        mixer.sync(audioRef.current.sources);
        const tracks = [video];
        if (mixer.isRunning) tracks.push(mixer.audioTrack);
        const mimeType = recordingMime();
        const recorder = new MediaRecorder(
          new MediaStream(tracks),
          mimeType
            ? { mimeType, videoBitsPerSecond: 16_000_000, audioBitsPerSecond: 256_000 }
            : { videoBitsPerSecond: 16_000_000, audioBitsPerSecond: 256_000 },
        );
        chunksRef.current = [];
        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) chunksRef.current.push(event.data);
        };
        video.addEventListener('ended', () => {
          void stop();
        });
        recorderRef.current = recorder;
        recorder.start(1000);
        const started = Date.now();
        setStartedAt(started);
        phaseRef.current = 'recording';
        setPhase('recording');
        publish(true, started);
      } catch {
        await mixer.close().catch(() => undefined);
        if (mixerRef.current === mixer) mixerRef.current = null;
        phaseRef.current = 'idle';
        setPhase('idle');
      }
    })();
  }, [active, publish, stop]);

  return { phase, startedAt, start, stop };
}
