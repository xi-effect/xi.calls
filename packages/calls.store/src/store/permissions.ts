import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type PermissionStateT = 'granted' | 'prompt' | 'denied' | 'unavailable' | undefined;

export type PermissionsState = {
  cameraPermission: PermissionStateT;
  microphonePermission: PermissionStateT;
  isLoading: boolean;
  isPermissionDialogOpen: boolean;
};

const initialState: PermissionsState = {
  cameraPermission: undefined,
  microphonePermission: undefined,
  isLoading: true,
  isPermissionDialogOpen: false,
};

export const usePermissionsStore = create<PermissionsState>()(
  persist(() => initialState, {
    name: 'permissions-storage',
    partialize: (state) => ({
      cameraPermission: state.cameraPermission,
      microphonePermission: state.microphonePermission,
    }),
  }),
);

export const openPermissionsDialog = () => {
  usePermissionsStore.setState({ isPermissionDialogOpen: true });
};

export const closePermissionsDialog = () => {
  usePermissionsStore.setState({ isPermissionDialogOpen: false });
};
