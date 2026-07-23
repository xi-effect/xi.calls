import { Header, UserTile, MediaDevices } from './components';
import { useMemo, useRef, useEffect, useCallback, useState } from 'react';
import {
  Track,
  LocalVideoTrack,
  LocalAudioTrack,
  createLocalVideoTrack,
  createLocalAudioTrack,
} from 'livekit-client';
import { usePreviewTracks } from '@livekit/components-react';
import { getBaselineAudioCaptureOptions } from '@xipkg/calls-config';
import {
  useVideoBlur,
  useResolveInitiallyDefaultDeviceId,
  usePersistentUserChoices,
  useNoiseCancellation,
} from '@xipkg/calls-hooks';
import { useCallsRuntimeConfig } from '@xipkg/calls-providers';
import { usePermissionsStore } from '@xipkg/calls-store';

export const PreJoin = () => {
  const {
    userChoices: { audioEnabled, videoEnabled, audioDeviceId, videoDeviceId },
    saveAudioInputDeviceId,
    saveVideoInputDeviceId,
  } = usePersistentUserChoices();

  const {
    noiseCancellation: { featureEnabled: noiseCancellationFeatureEnabled },
  } = useCallsRuntimeConfig();

  const initialUserChoices = useRef<{
    audioEnabled: boolean;
    videoEnabled: boolean;
    audioDeviceId: string;
    videoDeviceId: string;
  } | null>(null);

  // Сохраняем начальные настройки пользователя
  if (initialUserChoices.current === null) {
    initialUserChoices.current = {
      audioEnabled,
      videoEnabled,
      audioDeviceId,
      videoDeviceId,
    };
  }

  const onError = useCallback((e: Error) => {
    console.error('PreJoin ERROR:', e);
  }, []);

  // При входе в PreJoin запрашиваем разрешения — браузер покажет диалог при первом заходе.
  // Если пользователь отклонит или ещё не ответил, useWatchPermissions обновит store и покажем состояние «нет прав» на контролах.
  useEffect(() => {
    let cancelled = false;
    const request = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (!cancelled) stream.getTracks().forEach((t) => t.stop());
      } catch (error) {
        if (cancelled) return;
        // Permissions API не везде поддерживает 'camera'/'microphone' (см. useWatchPermissions)
        // либо ещё не успел отработать — при явном отказе синхронизируем store сразу,
        // чтобы индикация и подсказки в UI не оставались в устаревшем/неопределённом состоянии.
        const name = (error as DOMException)?.name;
        if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
          usePermissionsStore.setState((state) => ({
            cameraPermission:
              state.cameraPermission === 'granted' ? state.cameraPermission : 'denied',
            microphonePermission:
              state.microphonePermission === 'granted' ? state.microphonePermission : 'denied',
          }));
        }
      }
    };
    request();
    return () => {
      cancelled = true;
    };
  }, []);

  // Preview треки - создаются только если пользователь изначально включил их
  const baselineAudio = getBaselineAudioCaptureOptions();
  const tracks = usePreviewTracks(
    {
      audio: !!initialUserChoices.current &&
        initialUserChoices.current?.audioEnabled && {
          ...baselineAudio,
          deviceId: initialUserChoices.current.audioDeviceId,
        },
      video: !!initialUserChoices.current &&
        initialUserChoices.current?.videoEnabled && {
          deviceId: initialUserChoices.current.videoDeviceId,
        },
    },
    onError,
  );

  // Динамические треки - создаются "just-in-time" когда пользователь включает их
  const [dynamicVideoTrack, setDynamicVideoTrack] = useState<LocalVideoTrack | null>(null);
  const [dynamicAudioTrack, setDynamicAudioTrack] = useState<LocalAudioTrack | null>(null);

  const previewVideoTrack = useMemo(
    () => tracks?.filter((track) => track.kind === Track.Kind.Video)[0] as LocalVideoTrack,
    [tracks],
  );

  const previewAudioTrack = useMemo(
    () => tracks?.filter((track) => track.kind === Track.Kind.Audio)[0] as LocalAudioTrack,
    [tracks],
  );

  // Создаем динамический видео трек если пользователь включил камеру после загрузки
  useEffect(() => {
    const createVideoTrack = async () => {
      try {
        const track = await createLocalVideoTrack({
          deviceId: { exact: videoDeviceId },
        });
        setDynamicVideoTrack(track);
      } catch (error) {
        onError(error as Error);
      }
    };

    if (
      videoEnabled &&
      !initialUserChoices.current?.videoEnabled &&
      !previewVideoTrack &&
      !dynamicVideoTrack
    ) {
      createVideoTrack();
    }
  }, [videoEnabled, videoDeviceId, previewVideoTrack, dynamicVideoTrack, onError]);

  // Создаем динамический аудио трек если пользователь включил микрофон после загрузки
  useEffect(() => {
    const createAudioTrack = async () => {
      try {
        const track = await createLocalAudioTrack({
          ...getBaselineAudioCaptureOptions(),
          deviceId: { exact: audioDeviceId },
        });
        setDynamicAudioTrack(track);
      } catch (error) {
        onError(error as Error);
      }
    };

    if (
      audioEnabled &&
      !initialUserChoices.current?.audioEnabled &&
      !previewAudioTrack &&
      !dynamicAudioTrack
    ) {
      createAudioTrack();
    }
  }, [audioEnabled, audioDeviceId, previewAudioTrack, dynamicAudioTrack, onError]);

  // Очистка динамических треков
  useEffect(() => {
    return () => {
      dynamicVideoTrack?.stop();
    };
  }, [dynamicVideoTrack]);

  useEffect(() => {
    return () => {
      dynamicAudioTrack?.stop();
    };
  }, [dynamicAudioTrack]);

  // Финальные треки (динамические имеют приоритет над preview)
  const videoTrack = dynamicVideoTrack || previewVideoTrack;
  const audioTrack = dynamicAudioTrack || previewAudioTrack;

  // Разрешаем device ID для треков
  useResolveInitiallyDefaultDeviceId(audioDeviceId, audioTrack, saveAudioInputDeviceId);
  useResolveInitiallyDefaultDeviceId(videoDeviceId, videoTrack, saveVideoInputDeviceId);

  // Передаем видеотрек для использования блюра
  useVideoBlur(videoTrack);

  const noiseCancellation = useNoiseCancellation(null, {
    localAudioTrack: audioTrack ?? undefined,
  });

  return (
    <div className="bg-background-page flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <div
        className="calls-prejoin-scroll h-0 min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-y-contain pb-[var(--calls-layout-bottom-offset,0px)] max-[960px]:h-dvh max-[960px]:max-h-dvh max-[960px]:flex-none"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <div className="min-h-full p-5 pb-8">
          <Header />
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            <UserTile audioTrack={audioTrack} videoTrack={videoTrack} />
            <MediaDevices
              audioTrack={audioTrack}
              videoTrack={videoTrack}
              noiseCancellation={noiseCancellationFeatureEnabled ? noiseCancellation : undefined}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
