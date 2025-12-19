/* eslint-disable @typescript-eslint/no-explicit-any */
import { useNetworkControl } from './useNetworkControl';

/**
 * Hook for integrating network system with authentication system
 * Automatically suppresses network notifications on authentication errors
 */
export const useNetworkAuthIntegration = () => {
  const { setAuthErrorDetected } = useNetworkControl();

  // Function to set authentication error flag
  const setAuthError = (hasError: boolean) => {
    setAuthErrorDetected(hasError);
  };

  // Function to handle authentication errors
  const handleAuthError = (error: any) => {
    const isAuthError =
      error?.response?.status === 401 ||
      error?.response?.status === 403 ||
      // Add your own auth error checks here
      error?.response?.data?.detail === 'User not found' ||
      error?.response?.data?.detail === 'Wrong password';

    if (isAuthError) {
      setAuthErrorDetected(true);
      // Reset flag after some time
      setTimeout(() => {
        setAuthErrorDetected(false);
      }, 5000);
    }
  };

  return {
    setAuthError,
    handleAuthError,
  };
};
