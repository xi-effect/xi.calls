import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  loadUserChoices,
  saveUserChoices,
  LocalUserChoices as LocalUserChoicesLK,
} from '@livekit/components-core';
import { VideoQuality } from 'livekit-client';
import type { NoiseCancellationMode, VoiceEnhancementConfig } from '@xipkg/calls-types';

export type VideoResolution = 'h720' | 'h360' | 'h180';

export type LocalUserChoices = LocalUserChoicesLK & {
  noiseReductionEnabled?: boolean;
  blurEnabled?: boolean;
  audioOutputDeviceId?: string;
  videoPublishResolution?: VideoResolution;
  videoSubscribeQuality?: VideoQuality;
  /** Включено ли шумоподавление (любой режим кроме off). */
  noiseCancellationEnabled?: boolean;
  /** Режим шумоподавления: off | webrtc | krisp. */
  noiseCancellationMode?: NoiseCancellationMode;
  /** Громкость микрофона (0..1), для preview/тестов и будущей apply в звонке. */
  microphoneVolume?: number;
  /** Громкость динамиков (0..1), для тестового воспроизведения и будущей apply в звонке. */
  speakerVolume?: number;
  /** Зеркальное отражение локального превью камеры. */
  mirrorVideo?: boolean;
  /** Локальная WASM-обработка голоса перед публикацией микрофона. */
  voiceEnhancement?: VoiceEnhancementConfig;
};

function getUserChoicesState(): LocalUserChoices {
  return {
    noiseReductionEnabled: false,
    blurEnabled: false,
    audioOutputDeviceId: 'default',
    videoPublishResolution: 'h720',
    videoSubscribeQuality: VideoQuality.HIGH,
    noiseCancellationEnabled: false,
    noiseCancellationMode: 'webrtc',
    microphoneVolume: 1,
    speakerVolume: 1,
    mirrorVideo: true,
    voiceEnhancement: {
      enabled: false,
      intensity: 90,
    },
    ...loadUserChoices(),
  };
}

export const useUserChoicesStore = create<LocalUserChoices>()(
  persist(
    () => ({
      ...getUserChoicesState(),
    }),
    {
      name: 'user-choices-storage',
      onRehydrateStorage: () => (state) => {
        if (state) {
          saveUserChoices(state, false);
        }
      },
    },
  ),
);
