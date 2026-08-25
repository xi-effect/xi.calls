import { useMemo } from 'react';
import { usePermissionsStore } from '@xipkg/calls-store';

export const useCannotUseDevice = (kind: MediaDeviceKind) => {
  const { cameraPermission, microphonePermission, isLoading } = usePermissionsStore((state) => ({
    cameraPermission: state.cameraPermission,
    microphonePermission: state.microphonePermission,
    isLoading: state.isLoading,
  }));

  return useMemo(() => {
    if (isLoading) return true;

    switch (kind) {
      case 'audioinput':
      case 'audiooutput':
        return microphonePermission === 'denied' || microphonePermission === 'prompt';
      case 'videoinput':
        return cameraPermission === 'denied' || cameraPermission === 'prompt';
      default:
        return false;
    }
  }, [kind, isLoading, cameraPermission, microphonePermission]);
};
