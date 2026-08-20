import { useMemo } from 'react';
import { usePermissionsStore } from '@xipkg/calls-store';

export const useCannotUseDevice = (kind: MediaDeviceKind) => {
  const cameraPermission = usePermissionsStore((state) => state.cameraPermission);
  const microphonePermission = usePermissionsStore((state) => state.microphonePermission);
  const isLoading = usePermissionsStore((state) => state.isLoading);

  return useMemo(() => {
    if (isLoading) return true;

    const isMicrophoneDenied = microphonePermission === 'denied';
    const isMicrophonePrompted = microphonePermission === 'prompt';
    const isCameraDenied = cameraPermission === 'denied';
    const isCameraPrompted = cameraPermission === 'prompt';

    switch (kind) {
      case 'audioinput':
      case 'audiooutput':
        return isMicrophoneDenied || isMicrophonePrompted;
      case 'videoinput':
        return isCameraDenied || isCameraPrompted;
      default:
        return false;
    }
  }, [kind, isLoading, cameraPermission, microphonePermission]);
};
