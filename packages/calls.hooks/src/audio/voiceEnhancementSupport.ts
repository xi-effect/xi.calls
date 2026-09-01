export type VoiceEnhancementSupport = {
  supported: boolean;
  reason?: 'voice_enhancement_unsupported';
};

export function getVoiceEnhancementSupport(): VoiceEnhancementSupport {
  if (typeof window === 'undefined') {
    return { supported: false, reason: 'voice_enhancement_unsupported' };
  }

  const hasAudioContext = Boolean(
    window.AudioContext ||
    (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext,
  );
  const supported =
    hasAudioContext &&
    typeof window.MediaStream !== 'undefined' &&
    typeof window.WebAssembly !== 'undefined' &&
    typeof window.MediaStreamAudioSourceNode !== 'undefined' &&
    typeof window.MediaStreamAudioDestinationNode !== 'undefined';

  return supported
    ? { supported: true }
    : { supported: false, reason: 'voice_enhancement_unsupported' };
}

export function isVoiceEnhancementSupported(): boolean {
  return getVoiceEnhancementSupport().supported;
}
