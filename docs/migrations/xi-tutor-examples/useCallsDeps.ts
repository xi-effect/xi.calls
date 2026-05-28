/**
 * Эталон для xi.tutor/modules.calls/src/useCallsDeps.ts
 * Адаптирует common.services → CallsProviderDepsT
 */
import { useMemo } from 'react';
import type { CallsProviderDepsT } from '@xipkg/calls-providers';
import { env } from 'common.env';
import {
  useCurrentUser,
  useGetClassroom,
  useAddClassroomMaterials,
  useGetClassroomMaterialsList,
  useCreateTokenByTutor,
  useCreateTokenByStudent,
  useReactivateCall,
  useUpdateParticipantMetadata,
  useUpdateConferenceMetadata,
} from 'common.services';

export const useCallsDeps = (): CallsProviderDepsT => {
  const { createTokenByTutor } = useCreateTokenByTutor();
  const { createTokenByStudent } = useCreateTokenByStudent();
  const { reactivateCall } = useReactivateCall();
  const {
    updateParticipantMetadata,
    isPending,
    error: metadataError,
  } = useUpdateParticipantMetadata();
  const { updateConferenceMetadata } = useUpdateConferenceMetadata();
  const { addClassroomMaterials } = useAddClassroomMaterials();

  return useMemo(
    () => ({
      auth: {
        useCurrentUser,
      },
      room: {
        useGetClassroom,
        useAddClassroomMaterials: () => ({ addClassroomMaterials }),
        useGetClassroomMaterialsList,
      },
      callAuth: {
        createTokenByTutor: (data) => createTokenByTutor.mutateAsync(data),
        createTokenByStudent: (data) => createTokenByStudent.mutateAsync(data),
        reactivateCall: (data) => reactivateCall.mutateAsync(data),
        isLoading:
          createTokenByTutor.isPending ||
          createTokenByStudent.isPending ||
          reactivateCall.isPending,
        error: createTokenByTutor.error ?? createTokenByStudent.error ?? reactivateCall.error,
      },
      updateParticipantMetadata: {
        updateParticipantMetadata: (data) => updateParticipantMetadata.mutateAsync(data),
        isPending,
        error: metadataError,
      },
      conferenceMetadata: {
        updateConferenceMetadata: (data) => updateConferenceMetadata.mutateAsync(data),
      },
      appConfig: {
        getClassroomJoinLink: (classroomId) =>
          `${env.VITE_APP_DOMAIN}/classrooms/${classroomId}?tab=overview&goto=call`,
      },
    }),
    [
      addClassroomMaterials,
      createTokenByStudent,
      createTokenByTutor,
      isPending,
      metadataError,
      reactivateCall,
      updateConferenceMetadata,
      updateParticipantMetadata,
    ],
  );
};
