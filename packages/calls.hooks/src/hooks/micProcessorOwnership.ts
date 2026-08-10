import type { LocalAudioTrack } from 'livekit-client';

/**
 * LiveKit допускает ровно ОДИН TrackProcessor на трек: setProcessor() сам вызывает
 * internalStopProcessor() для предыдущего перед установкой нового. useMicrophoneVolume
 * (гейн) и useNoiseCancellation (Krisp) исторически дёргали track.setProcessor()/
 * stopProcessor() независимо друг от друга, ничего не зная друг о друге — при
 * одновременном использовании обеих фич один хук молча убивал работу другого (эффект,
 * выполнившийся позже, сносил процессор, поставленный раньше).
 *
 * Это простой арбитр владения слотом процессора конкретного трека: кто первый явно
 * заявил владение — тот и работает с track.setProcessor()/stopProcessor(); другой хук
 * при отказе не трогает трек вообще (в т.ч. не вызывает stopProcessor() за чужим
 * процессором) и деградирует без потери звука, а не гонится за чужим слотом.
 */

const ownerByTrack = new WeakMap<LocalAudioTrack, string>();

export function claimMicProcessorSlot(track: LocalAudioTrack, owner: string): boolean {
  const current = ownerByTrack.get(track);
  if (current && current !== owner) return false;
  ownerByTrack.set(track, owner);
  return true;
}

export function releaseMicProcessorSlot(track: LocalAudioTrack, owner: string): void {
  if (ownerByTrack.get(track) === owner) {
    ownerByTrack.delete(track);
  }
}

export function currentMicProcessorOwner(track: LocalAudioTrack): string | undefined {
  return ownerByTrack.get(track);
}
