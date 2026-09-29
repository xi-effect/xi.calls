import { useCallback, useMemo } from 'react';
import {
  useLocalParticipant,
  useMaybeRoomContext,
  useMediaDeviceSelect,
  usePersistentUserChoices,
} from '@livekit/components-react';
import type { LocalAudioTrack, LocalVideoTrack } from 'livekit-client';
import { excludeOsDefaultDevices } from '@xipkg/calls-utils';
import { useUserChoicesStore } from '@xipkg/calls-store';
import { useSwitchDevice } from './useSwitchDevice';
import { useResolvedActiveDeviceId } from './useResolvedActiveDeviceId';

export type DeviceMenuGroupKindT = 'audioinput' | 'audiooutput' | 'videoinput';

export type DeviceMenuGroupT = {
  kind: DeviceMenuGroupKindT;
  devices: MediaDeviceInfo[];
  activeDeviceId?: string;
  onSelectDevice: (deviceId: string) => void | Promise<void>;
};

type UseDeviceMenuGroupsResult = {
  /** Группы для кнопки микрофона: сам микрофон + вывод звука (динамики). */
  microphoneGroups: DeviceMenuGroupT[];
  /** Группы для кнопки камеры. */
  cameraGroups: DeviceMenuGroupT[];
};

/**
 * Собирает списки устройств, активные id и обработчики переключения для
 * поповеров у кнопок микрофона и камеры.
 *
 * Динамики живут в группе микрофона, а не отдельной кнопкой: у вывода звука нет
 * своей кнопки в баре, а искать его только в настройках неудобно. Из-за этого же
 * попап у микрофона имеет смысл даже когда микрофон в системе один — переключать
 * всё равно есть что.
 *
 * Требует контекста комнаты LiveKit (`useLocalParticipant`), поэтому подходит
 * только для экранов внутри звонка; в PreJoin комнаты ещё нет.
 */
export const useDeviceMenuGroups = (): UseDeviceMenuGroupsResult => {
  const room = useMaybeRoomContext();
  const { microphoneTrack, cameraTrack } = useLocalParticipant();
  const audioTrack = microphoneTrack?.track as LocalAudioTrack | undefined;
  const videoTrack = cameraTrack?.track as LocalVideoTrack | undefined;

  const {
    userChoices: { audioDeviceId, videoDeviceId },
    saveAudioInputDeviceId,
    saveVideoInputDeviceId,
    saveAudioInputEnabled,
    saveVideoInputEnabled,
  } = usePersistentUserChoices();
  // audioOutputDeviceId LiveKit не знает — он живёт только в нашем сторе.
  const audioOutputDeviceId = useUserChoicesStore((state) => state.audioOutputDeviceId);

  const { devices: rawAudioDevices, activeDeviceId: activeAudioDeviceId } = useMediaDeviceSelect({
    kind: 'audioinput',
  });
  const { devices: rawVideoDevices, activeDeviceId: activeVideoDeviceId } = useMediaDeviceSelect({
    kind: 'videoinput',
  });
  const { devices: rawOutputDevices, activeDeviceId: activeOutputDeviceId } = useMediaDeviceSelect({
    kind: 'audiooutput',
  });

  const audioDevices = useMemo(() => excludeOsDefaultDevices(rawAudioDevices), [rawAudioDevices]);
  const videoDevices = useMemo(() => excludeOsDefaultDevices(rawVideoDevices), [rawVideoDevices]);
  const outputDevices = useMemo(
    () => excludeOsDefaultDevices(rawOutputDevices),
    [rawOutputDevices],
  );

  const { switchDeviceHandler: selectAudioDeviceHandler, pendingDeviceId: pendingAudioDeviceId } =
    useSwitchDevice({
      track: audioTrack,
      activeDeviceId: activeAudioDeviceId,
      saveDeviceId: saveAudioInputDeviceId,
      saveEnabled: saveAudioInputEnabled,
      errorMessage: 'Failed to switch microphone device',
    });

  const { switchDeviceHandler: selectVideoDeviceHandler, pendingDeviceId: pendingVideoDeviceId } =
    useSwitchDevice({
      track: videoTrack,
      activeDeviceId: activeVideoDeviceId,
      saveDeviceId: saveVideoInputDeviceId,
      saveEnabled: saveVideoInputEnabled,
      errorMessage: 'Failed to switch camera device',
    });

  // У динамиков нет трека и mute — переключение идёт через room.switchActiveDevice
  // (внутри setSinkId на элементах воспроизведения), поэтому не useSwitchDevice.
  const selectOutputDeviceHandler = useCallback(
    async (deviceId: string) => {
      try {
        await room?.switchActiveDevice('audiooutput', deviceId);
        // Сохраняем только после успеха, иначе запомним нерабочее устройство.
        useUserChoicesStore.setState({ audioOutputDeviceId: deviceId });
      } catch (err) {
        console.error('Failed to switch audio output device', err);
      }
    },
    [room],
  );

  const resolvedAudioDeviceId = useResolvedActiveDeviceId(audioDevices, activeAudioDeviceId, {
    track: audioTrack,
    pendingDeviceId: pendingAudioDeviceId,
    fallbackDeviceId: audioDeviceId,
  });
  const resolvedVideoDeviceId = useResolvedActiveDeviceId(videoDevices, activeVideoDeviceId, {
    track: videoTrack,
    pendingDeviceId: pendingVideoDeviceId,
    fallbackDeviceId: videoDeviceId,
  });
  const resolvedOutputDeviceId = useResolvedActiveDeviceId(outputDevices, activeOutputDeviceId, {
    fallbackDeviceId: audioOutputDeviceId,
  });

  const microphoneGroups = useMemo<DeviceMenuGroupT[]>(
    () => [
      {
        kind: 'audioinput',
        devices: audioDevices,
        activeDeviceId: resolvedAudioDeviceId,
        onSelectDevice: selectAudioDeviceHandler,
      },
      {
        kind: 'audiooutput',
        devices: outputDevices,
        activeDeviceId: resolvedOutputDeviceId,
        onSelectDevice: selectOutputDeviceHandler,
      },
    ],
    [
      audioDevices,
      resolvedAudioDeviceId,
      selectAudioDeviceHandler,
      outputDevices,
      resolvedOutputDeviceId,
      selectOutputDeviceHandler,
    ],
  );

  const cameraGroups = useMemo<DeviceMenuGroupT[]>(
    () => [
      {
        kind: 'videoinput',
        devices: videoDevices,
        activeDeviceId: resolvedVideoDeviceId,
        onSelectDevice: selectVideoDeviceHandler,
      },
    ],
    [videoDevices, resolvedVideoDeviceId, selectVideoDeviceHandler],
  );

  return { microphoneGroups, cameraGroups };
};
