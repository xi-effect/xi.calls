/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallStore } from 'calls.store';
import { useCalls, useCallsNavigation } from 'calls.providers';
import { StartCallDataT } from 'common.types';

export const useStartCall = () => {
  const navigation = useCallsNavigation();
  const { useCurrentUser } = useCalls().auth;
  const { createTokenByStudent, createTokenByTutor, reactivateCall, isLoading, error } =
    useCalls().callAuth;

  const { data: user } = useCurrentUser();
  const isTutor = user?.default_layout === 'tutor';
  const { updateStore } = useCallStore();

  const handleTokenToStartCall = async (data: StartCallDataT) => {
    const tokenResponse = isTutor
      ? await createTokenByTutor(data)
      : await createTokenByStudent(data);

    if (tokenResponse) {
      updateStore('token', tokenResponse);

      navigation.navigateToCall(data.classroom_id);
    }

    return null;
  };

  const startCall = async (data: StartCallDataT) => {
    try {
      await handleTokenToStartCall(data);
    } catch (error: any) {
      if (error.response?.status === 409 && isTutor) {
        try {
          await reactivateCall(data);
          await handleTokenToStartCall(data);
        } catch (error: any) {
          console.error('Ошибка при реактивировании комнаты:', error);
          throw error;
        }
      }
    }
  };

  return {
    startCall,
    isLoading,
    error,
  };
};
