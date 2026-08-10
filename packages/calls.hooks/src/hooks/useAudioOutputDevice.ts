import { useEffect } from 'react';
import type { Room } from 'livekit-client';
import { useUserChoicesStore } from '@xipkg/calls-store';

/**
 * Синхронизирует выбранное устройство вывода из userChoices с LiveKit Room
 * (`room.switchActiveDevice('audiooutput', deviceId)` → setSinkId на remote audio).
 */
export function useAudioOutputDevice(room: Room | null | undefined) {
  const audioOutputDeviceId = useUserChoicesStore((s) => s.audioOutputDeviceId);

  useEffect(() => {
    if (!room || !audioOutputDeviceId) return;

    let cancelled = false;

    const apply = async () => {
      try {
        await room.switchActiveDevice('audiooutput', audioOutputDeviceId);
      } catch (error) {
        if (!cancelled) {
          console.warn('Failed to switch audio output device:', error);
        }
      }
    };

    void apply();

    return () => {
      cancelled = true;
    };
  }, [room, audioOutputDeviceId]);
}
