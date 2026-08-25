import { useMemo } from 'react';
import { usePermissionsStore } from '@xipkg/calls-store';

export const useCannotUseDevice = (kind: MediaDeviceKind) => {
  // Нельзя возвращать новый объект из селектора — zustand сравнивает через Object.is.
  const cameraPermission = usePermissionsStore((state) => state.cameraPermission);
  const microphonePermission = usePermissionsStore((state) => state.microphonePermission);
  const isLoading = usePermissionsStore((state) => state.isLoading);

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
