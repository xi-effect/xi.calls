import type { LocalAudioTrack, LocalVideoTrack } from 'livekit-client';

/**
 * livekit-client не сериализует конкурентные `track.setDeviceId()`: быстрое
 * переключение A→B может физически оставить трек на A, если его `restart()`
 * завершится позже, чем у B (оба гоняются за общим `_constraints` трека).
 *
 * `WeakMap` по объекту трека — вызовы из любого места (`useSwitchDevice`,
 * `MediaDevices`, `SoundAndVideoSettings`) встают в одну очередь на трек и
 * выполняются строго по одному, так что гонка не возникает.
 */
const trackSwitchQueues = new WeakMap<LocalAudioTrack | LocalVideoTrack, Promise<unknown>>();

export function queuedSetDeviceId(
  track: LocalAudioTrack | LocalVideoTrack,
  deviceId: string,
): Promise<boolean> {
  const previous = trackSwitchQueues.get(track) ?? Promise.resolve();
  // Ошибка предыдущего вызова не должна останавливать очередь для следующих.
  const next = previous.catch(() => undefined).then(() => track.setDeviceId({ exact: deviceId }));
  trackSwitchQueues.set(track, next);
  return next;
}
