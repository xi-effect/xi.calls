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
