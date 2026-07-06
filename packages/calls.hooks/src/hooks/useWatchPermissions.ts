import { useEffect } from 'react';
import { usePermissionsStore } from '@xipkg/calls-store';
import { isSafari } from '@xipkg/calls-utils';

const POLLING_TIME = 500;

export const useWatchPermissions = () => {
  useEffect(() => {
    let cleanup: (() => void) | undefined;
    let intervalId: number | undefined;
    let isCancelled = false;

    // Актуальные значения состояний permission-ов (не полагаемся на замыкание
    // первого query, иначе polling/change-хендлеры могут работать со старыми данными).
    const latest: { camera: PermissionState | undefined; microphone: PermissionState | undefined } =
      {
        camera: undefined,
        microphone: undefined,
      };

    const stopPolling = () => {
      if (intervalId !== undefined) {
        clearInterval(intervalId);
        intervalId = undefined;
      }
    };

    const checkPermissions = async () => {
      try {
        if (!navigator.permissions) {
          if (!isCancelled) {
            usePermissionsStore.setState({
              cameraPermission: 'unavailable',
              microphonePermission: 'unavailable',
            });
          }
          return;
        }

        const [cameraPermission, microphonePermission] = await Promise.all([
          navigator.permissions.query({ name: 'camera' as PermissionName }),
          navigator.permissions.query({ name: 'microphone' as PermissionName }),
        ]);

        if (isCancelled) return;

        latest.camera = cameraPermission.state;
        latest.microphone = microphonePermission.state;

        usePermissionsStore.setState({
          cameraPermission: cameraPermission.state,
          microphonePermission: microphonePermission.state,
        });

        if (
          isSafari() &&
          (cameraPermission.state === 'prompt' || microphonePermission.state === 'prompt')
        ) {
          intervalId = window.setInterval(async () => {
            if (isCancelled) return;

            const [camera, microphone] = await Promise.all([
              navigator.permissions.query({ name: 'camera' as PermissionName }),
              navigator.permissions.query({ name: 'microphone' as PermissionName }),
            ]);

            if (isCancelled) return;

            latest.camera = camera.state;
            latest.microphone = microphone.state;

            usePermissionsStore.setState({
              cameraPermission: camera.state,
              microphonePermission: microphone.state,
            });

            if (camera.state !== 'prompt' && microphone.state !== 'prompt') {
              stopPolling();
            }
          }, POLLING_TIME);
        }

        const handleCameraChange = (e: Event) => {
          const target = e.target as PermissionStatus;
          latest.camera = target.state;
          usePermissionsStore.setState({ cameraPermission: target.state });

          if (latest.camera !== 'prompt' && latest.microphone !== 'prompt') {
            stopPolling();
          }
        };

        const handleMicrophoneChange = (e: Event) => {
          const target = e.target as PermissionStatus;
          latest.microphone = target.state;
          usePermissionsStore.setState({ microphonePermission: target.state });

          if (latest.camera !== 'prompt' && latest.microphone !== 'prompt') {
            stopPolling();
          }
        };

        cameraPermission.addEventListener('change', handleCameraChange);
        microphonePermission.addEventListener('change', handleMicrophoneChange);

        cleanup = () => {
          cameraPermission.removeEventListener('change', handleCameraChange);
          microphonePermission.removeEventListener('change', handleMicrophoneChange);
          stopPolling();
        };
      } catch (error) {
        if (!isCancelled) {
          console.error('Error checking permissions:', error);
          // Permissions API недоступен или не поддерживает имена camera/microphone
          // (старые версии Firefox/Safari) — явно фиксируем это, а не оставляем
          // store в устаревшем/неопределённом состоянии (из-за чего индикация и
          // подсказки переставали адекватно реагировать на реальные права доступа).
          usePermissionsStore.setState({
            cameraPermission: 'unavailable',
            microphonePermission: 'unavailable',
          });
        }
      } finally {
        if (!isCancelled) {
          usePermissionsStore.setState({ isLoading: false });
        }
      }
    };
    checkPermissions();

    return () => {
      isCancelled = true;
      stopPolling();
      cleanup?.();
    };
  }, []);
};
