/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallStore } from '../store/callStore';
import { useNavigate } from '@tanstack/react-router';
import { StartCallDataT } from '../types';
import { useCalls } from '../providers';

export const useStartCall = () => {
  const navigate = useNavigate();

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

      navigate({
        to: '/call/$callId',
        params: { callId: data.classroom_id },
      });
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
