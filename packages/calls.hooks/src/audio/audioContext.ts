let voiceEnhancementAudioContext: AudioContext | undefined;
let activeProcessors = 0;
let lifecycleOperation: Promise<void> = Promise.resolve();

function getAudioContextConstructor(): typeof AudioContext | undefined {
  if (typeof window === 'undefined') return undefined;
  return (
    window.AudioContext ??
    (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  );
}

export function getVoiceEnhancementAudioContext(): AudioContext {
  if (!voiceEnhancementAudioContext || voiceEnhancementAudioContext.state === 'closed') {
    const AudioContextConstructor = getAudioContextConstructor();
    if (!AudioContextConstructor) {
      throw new Error('voice_enhancement_unsupported');
    }
    voiceEnhancementAudioContext = new AudioContextConstructor();
  }
  return voiceEnhancementAudioContext;
}

export async function acquireVoiceEnhancementAudioContext(): Promise<AudioContext> {
  const context = getVoiceEnhancementAudioContext();
  activeProcessors += 1;
  lifecycleOperation = lifecycleOperation
    .catch(() => undefined)
    .then(async () => {
      if (activeProcessors > 0 && context.state === 'suspended') {
        await context.resume();
      }
    });
  await lifecycleOperation;
  return context;
}

export async function releaseVoiceEnhancementAudioContext(): Promise<void> {
  activeProcessors = Math.max(0, activeProcessors - 1);
  const context = voiceEnhancementAudioContext;
  if (!context) return;

  lifecycleOperation = lifecycleOperation
    .catch(() => undefined)
    .then(async () => {
      if (activeProcessors === 0 && context.state === 'running') {
        await context.suspend();
      }
    });
  await lifecycleOperation;
}
