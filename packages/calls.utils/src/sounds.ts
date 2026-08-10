/**
 * Утилита для воспроизведения звуков уведомлений в ВКС
 */

const SOUND_PATHS = {
  chatMessage: '/sounds/chat-message.wav',
  handRaise: '/sounds/hand-raise.wav',
  userJoin: '/sounds/user-join-to-call.mp3',
  userLeft: '/sounds/user-left-from-call.mp3',
} as const;

type SoundType = keyof typeof SOUND_PATHS;

/** Для join/left — воспроизводим только начало файла (мс). */
const JOIN_LEAVE_PLAY_MS = 500;

type TrimmedSoundType = Extract<SoundType, 'userJoin' | 'userLeft'>;
const trimTimeouts = new Map<TrimmedSoundType, ReturnType<typeof setTimeout>>();

// Кэш для Audio объектов, чтобы не создавать их каждый раз
const soundCache = new Map<SoundType, HTMLAudioElement>();

/**
 * Получает или создает Audio объект для звука
 */
const getAudio = (soundType: SoundType): HTMLAudioElement => {
  if (!soundCache.has(soundType)) {
    const audio = new Audio(SOUND_PATHS[soundType]);
    audio.preload = 'auto';
    soundCache.set(soundType, audio);
  }
  return soundCache.get(soundType)!;
};

const clearJoinLeaveTrim = (soundType: TrimmedSoundType) => {
  const id = trimTimeouts.get(soundType);
  if (id !== undefined) {
    clearTimeout(id);
    trimTimeouts.delete(soundType);
  }
};

const scheduleJoinLeaveTrim = (audio: HTMLAudioElement, soundType: TrimmedSoundType) => {
  clearJoinLeaveTrim(soundType);
  const id = setTimeout(() => {
    try {
      audio.pause();
      audio.currentTime = 0;
    } catch {
      /* ignore */
    }
    trimTimeouts.delete(soundType);
  }, JOIN_LEAVE_PLAY_MS);
  trimTimeouts.set(soundType, id);
};

/**
 * Воспроизводит звук с указанной громкостью
 * @param soundType - тип звука (chatMessage или handRaise)
 * @param volume - громкость от 0 до 1 (0 = беззвучно, 1 = максимальная громкость)
 */
export const playSound = (soundType: SoundType, volume: number = 1): void => {
  try {
    const audio = getAudio(soundType);

    if (soundType === 'userJoin' || soundType === 'userLeft') {
      clearJoinLeaveTrim(soundType);
    }

    // Устанавливаем громкость (от 0 до 1)
    const clampedVolume = Math.max(0, Math.min(1, volume));
    audio.volume = clampedVolume;

    // Сбрасываем позицию на начало и воспроизводим
    audio.currentTime = 0;
    void audio
      .play()
      .then(() => {
        if (soundType === 'userJoin' || soundType === 'userLeft') {
          scheduleJoinLeaveTrim(audio, soundType);
        }
      })
      .catch((error) => {
        // Игнорируем ошибки воспроизведения (например, если пользователь не взаимодействовал со страницей)
        console.warn(`⚠️ Failed to play sound ${soundType}:`, error);
      });
  } catch (error) {
    console.error(`❌ Error playing sound ${soundType}:`, error);
  }
};

type PlaySoundOnDeviceOptions = {
  volume?: number;
  /** deviceId устройства вывода (HTMLMediaElement.setSinkId), если поддерживается */
  sinkId?: string;
};

type AudioContextWithSink = AudioContext & {
  setSinkId?: (id: string) => Promise<void>;
};

/**
 * Воспроизводит тестовый звук на выбранном устройстве вывода.
 * Возвращает Promise, который резолвится после старта playback (или reject при ошибке).
 * Требует, чтобы хост отдавал файлы из `/sounds/...`.
 */
export const playSoundOnDevice = async (
  soundType: SoundType,
  options: PlaySoundOnDeviceOptions = {},
): Promise<void> => {
  const { volume = 1, sinkId } = options;
  const audio = new Audio(SOUND_PATHS[soundType]);
  audio.volume = Math.max(0, Math.min(1, volume));

  const audioWithSink = audio as HTMLAudioElement & {
    setSinkId?: (id: string) => Promise<void>;
  };

  if (sinkId && typeof audioWithSink.setSinkId === 'function') {
    try {
      await audioWithSink.setSinkId(sinkId);
    } catch (error) {
      console.warn('⚠️ Failed to set audio output device:', error);
    }
  }

  audio.currentTime = 0;
  await audio.play();
};

type PlaySpeakerTestToneOptions = {
  volume?: number;
  /** deviceId устройства вывода (AudioContext.setSinkId), если поддерживается */
  sinkId?: string;
  durationMs?: number;
  frequencyHz?: number;
};

/**
 * Тестовый тон через Web Audio API — не зависит от файлов `/sounds/*` на хосте.
 * Использует AudioContext.setSinkId, когда браузер и deviceId это позволяют.
 */
export const playSpeakerTestTone = async (
  options: PlaySpeakerTestToneOptions = {},
): Promise<void> => {
  const { volume = 1, sinkId, durationMs = 900, frequencyHz = 880 } = options;

  const AudioContextCtor =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

  if (!AudioContextCtor) {
    throw new Error('AudioContext is not supported');
  }

  const ctx = new AudioContextCtor() as AudioContextWithSink;

  try {
    if (sinkId && typeof ctx.setSinkId === 'function') {
      try {
        await ctx.setSinkId(sinkId);
      } catch (error) {
        console.warn('⚠️ Failed to set audio output device for test tone:', error);
      }
    }

    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = frequencyHz;

    const peak = Math.max(0, Math.min(1, volume)) * 0.22;
    const now = ctx.currentTime;
    const end = now + durationMs / 1000;

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(peak, now + 0.04);
    gain.gain.linearRampToValueAtTime(peak * 0.85, end - 0.12);
    gain.gain.linearRampToValueAtTime(0, end);

    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start(now);
    oscillator.stop(end);

    await new Promise<void>((resolve) => {
      window.setTimeout(resolve, durationMs + 40);
    });
  } finally {
    await ctx.close().catch(() => {
      /* ignore */
    });
  }
};
