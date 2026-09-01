import { useCallback, useEffect } from 'react';
import type { LocalAudioTrack } from 'livekit-client';
import { create } from 'zustand';
import { useUserChoicesStore } from '@xipkg/calls-store';
import type { VoiceEnhancementConfig } from '@xipkg/calls-types';
import {
  VoiceEnhancementError,
  VoiceEnhancementProcessor,
  toVoiceEnhancementError,
  type VoiceEnhancementErrorType,
} from '../audio/VoiceEnhancementProcessor';
import { isVoiceEnhancementSupported } from '../audio/voiceEnhancementSupport';
import { releaseMicProcessorSlot, takeMicProcessorSlot } from './micProcessorOwnership';

const VOICE_ENHANCEMENT_OWNER = 'xi-voice-enhancement';
const DEFAULT_INTENSITY = 90;

export type VoiceEnhancementStatus = 'disabled' | 'loading' | 'enabled' | 'error' | 'unsupported';

type RuntimeState = {
  status: VoiceEnhancementStatus;
  error: VoiceEnhancementErrorType | null;
};

const useVoiceEnhancementRuntime = create<RuntimeState>()(() => ({
  status: isVoiceEnhancementSupported() ? 'disabled' : 'unsupported',
  error: null,
}));

let managedTrack: LocalAudioTrack | undefined;
let activeTrack: LocalAudioTrack | undefined;
let activeProcessor: VoiceEnhancementProcessor | undefined;
let pendingProcessor: VoiceEnhancementProcessor | undefined;
let operationRevision = 0;
let operationQueue: Promise<void> = Promise.resolve();

function getEnvironmentMetadata(): { browser: string; os: string } {
  if (typeof navigator === 'undefined') return { browser: 'unknown', os: 'unknown' };
  const ua = navigator.userAgent;
  const browser = /Edg\//.test(ua)
    ? 'edge'
    : /Firefox\//.test(ua)
      ? 'firefox'
      : /Chrome\//.test(ua)
        ? 'chrome'
        : /Safari\//.test(ua)
          ? 'safari'
          : 'other';
  const os = /iPad|iPhone|iPod/.test(ua)
    ? 'ios'
    : /Android/.test(ua)
      ? 'android'
      : /Mac OS X/.test(ua)
        ? 'macos'
        : /Windows/.test(ua)
          ? 'windows'
          : /Linux/.test(ua)
            ? 'linux'
            : 'other';
  return { browser, os };
}

function trackEvent(name: string, data?: Record<string, string>): void {
  if (typeof window === 'undefined') return;
  const umami = (
    window as typeof window & {
      umami?: { track: (event: string, properties?: Record<string, string>) => void };
    }
  ).umami;
  umami?.track(name, data);
}

function reportUnexpectedError(error: VoiceEnhancementError): void {
  const metadata = getEnvironmentMetadata();
  void import('@sentry/browser')
    .then(({ captureException }) => {
      captureException(new Error(error.type), {
        tags: {
          feature: 'voice_enhancement',
          errorType: error.type,
          ...metadata,
        },
      });
    })
    .catch(() => undefined);
}

function setRuntime(status: VoiceEnhancementStatus, error: VoiceEnhancementErrorType | null): void {
  useVoiceEnhancementRuntime.setState({ status, error });
}

async function stopActiveProcessor(): Promise<void> {
  const track = activeTrack;
  const processor = activeProcessor;
  activeTrack = undefined;
  activeProcessor = undefined;

  if (!track || !processor) return;
  try {
    if (track.getProcessor() === processor) {
      await track.stopProcessor();
    } else {
      await processor.destroy();
    }
  } finally {
    releaseMicProcessorSlot(track, VOICE_ENHANCEMENT_OWNER);
  }
}

function failVoiceEnhancement(error: unknown): void {
  const typedError = toVoiceEnhancementError(error, 'voice_enhancement_init_failed');
  setRuntime('error', typedError.type);
  useUserChoicesStore.setState((state) => ({
    voiceEnhancement: {
      enabled: false,
      intensity: state.voiceEnhancement?.intensity ?? DEFAULT_INTENSITY,
    },
  }));
  const metadata = getEnvironmentMetadata();
  trackEvent('call_voice_enhancement_failed', {
    ...metadata,
    errorType: typedError.type,
  });
  if (typedError.type !== 'voice_enhancement_unsupported') {
    reportUnexpectedError(typedError);
  }
}

async function applyVoiceEnhancement(
  revision: number,
  track: LocalAudioTrack | undefined,
  config: VoiceEnhancementConfig,
): Promise<void> {
  if (revision !== operationRevision) return;

  if (!config.enabled || !track) {
    await stopActiveProcessor().catch(() => undefined);
    if (revision === operationRevision) {
      const currentStatus = useVoiceEnhancementRuntime.getState().status;
      if (config.enabled) {
        setRuntime('enabled', null);
      } else if (currentStatus !== 'error') {
        setRuntime('disabled', null);
      }
    }
    return;
  }

  if (!isVoiceEnhancementSupported()) {
    failVoiceEnhancement(new VoiceEnhancementError('voice_enhancement_unsupported'));
    return;
  }

  if (activeTrack === track && activeProcessor && track.getProcessor() === activeProcessor) {
    activeProcessor.setIntensity(config.intensity);
    setRuntime('enabled', null);
    return;
  }

  await stopActiveProcessor().catch(() => undefined);
  if (revision !== operationRevision) return;

  setRuntime('loading', null);
  try {
    await takeMicProcessorSlot(track, VOICE_ENHANCEMENT_OWNER);
    if (revision !== operationRevision) {
      releaseMicProcessorSlot(track, VOICE_ENHANCEMENT_OWNER);
      return;
    }

    const processor = new VoiceEnhancementProcessor({
      intensity: config.intensity,
      onError: (error) => {
        failVoiceEnhancement(error);
        requestReconcile();
      },
    });
    pendingProcessor = processor;
    await track.setProcessor(processor);
    pendingProcessor = undefined;

    if (revision !== operationRevision || !config.enabled) {
      if (track.getProcessor() === processor) {
        await track.stopProcessor();
      } else {
        await processor.destroy();
      }
      releaseMicProcessorSlot(track, VOICE_ENHANCEMENT_OWNER);
      return;
    }

    activeTrack = track;
    activeProcessor = processor;
    setRuntime('enabled', null);
    trackEvent('call_voice_enhancement_enabled', getEnvironmentMetadata());
  } catch (error) {
    pendingProcessor = undefined;
    releaseMicProcessorSlot(track, VOICE_ENHANCEMENT_OWNER);
    if (
      revision !== operationRevision ||
      (error instanceof DOMException && error.name === 'AbortError')
    ) {
      return;
    }
    failVoiceEnhancement(error);
  }
}

function requestReconcile(): void {
  operationRevision += 1;
  const revision = operationRevision;
  const config = useUserChoicesStore.getState().voiceEnhancement ?? {
    enabled: false,
    intensity: DEFAULT_INTENSITY,
  };
  const track = managedTrack;

  if (!config.enabled) {
    void pendingProcessor?.destroy();
  }

  operationQueue = operationQueue
    .catch(() => undefined)
    .then(() => applyVoiceEnhancement(revision, track, config));
}

export type UseVoiceEnhancementOptions = {
  localAudioTrack?: LocalAudioTrack;
  manageTrack?: boolean;
};

export type UseVoiceEnhancementResult = {
  enabled: boolean;
  supported: boolean;
  status: VoiceEnhancementStatus;
  enable: () => void;
  disable: () => void;
  error: VoiceEnhancementErrorType | null;
};

export function useVoiceEnhancement(
  options: UseVoiceEnhancementOptions = {},
): UseVoiceEnhancementResult {
  const { localAudioTrack, manageTrack = false } = options;
  const config = useUserChoicesStore((state) => state.voiceEnhancement) ?? {
    enabled: false,
    intensity: DEFAULT_INTENSITY,
  };
  const runtime = useVoiceEnhancementRuntime();
  const supported = isVoiceEnhancementSupported();

  useEffect(() => {
    if (!manageTrack) return;
    managedTrack = localAudioTrack;
    requestReconcile();
    return () => {
      if (managedTrack === localAudioTrack) {
        managedTrack = undefined;
        requestReconcile();
      }
    };
  }, [localAudioTrack, manageTrack]);

  useEffect(() => {
    if (!manageTrack) return;
    requestReconcile();
  }, [config.enabled, config.intensity, manageTrack]);

  useEffect(() => {
    if (!supported) {
      setRuntime('unsupported', 'voice_enhancement_unsupported');
    } else if (!config.enabled && runtime.status === 'unsupported') {
      setRuntime('disabled', null);
    }
  }, [config.enabled, runtime.status, supported]);

  const enable = useCallback(() => {
    if (!supported || runtime.status === 'loading') return;
    useUserChoicesStore.setState((state) => ({
      noiseCancellationMode:
        state.noiseCancellationMode === 'krisp' ? 'webrtc' : state.noiseCancellationMode,
      voiceEnhancement: {
        enabled: true,
        intensity: state.voiceEnhancement?.intensity ?? DEFAULT_INTENSITY,
      },
    }));
    if (!managedTrack) setRuntime('enabled', null);
  }, [runtime.status, supported]);

  const disable = useCallback(() => {
    setRuntime('disabled', null);
    useUserChoicesStore.setState((state) => ({
      voiceEnhancement: {
        enabled: false,
        intensity: state.voiceEnhancement?.intensity ?? DEFAULT_INTENSITY,
      },
    }));
    trackEvent('call_voice_enhancement_disabled', getEnvironmentMetadata());
  }, []);

  return {
    enabled: config.enabled,
    supported,
    status: supported ? runtime.status : 'unsupported',
    enable,
    disable,
    error: supported ? runtime.error : 'voice_enhancement_unsupported',
  };
}
