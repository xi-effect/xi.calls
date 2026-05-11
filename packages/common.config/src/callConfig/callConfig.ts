import { env } from 'common.env';

export const allowKrispNoiseCancellation = env.VITE_ALLOW_KRISP_NOISE_CANCELLATION;

/** Включён ли UI шумоподавления (выбор режима). По умолчанию false — только WebRTC через Room. */
export const noiseCancellationFeatureEnabled = env.VITE_NOISE_CANCELLATION_FEATURE_ENABLED;

/** Базовые WebRTC-ограничения для захвата аудио (эхо, шум, AGC). */
export function getBaselineAudioCaptureOptions(): {
  echoCancellation: true;
  noiseSuppression: true;
  autoGainControl: true;
} {
  return {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  };
}
