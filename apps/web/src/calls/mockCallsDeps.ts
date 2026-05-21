import type { CallsProviderDepsT } from '@xipkg/calls-providers';

const DEMO_CLASSROOM_NAME = 'Демо-кабинет (без бэкенда)';

const mockBoards = [
  {
    id: '1',
    name: 'Демо-доска 1',
    content_kind: 'board' as const,
    student_access_mode: 'read_write' as const,
  },
  {
    id: '2',
    name: 'Демо-доска 2',
    content_kind: 'board' as const,
    student_access_mode: 'read_write' as const,
  },
];

/** Порты ВКС без запросов к API xi.tutor — только LiveKit dev-mode локально */
export const createMockCallsDeps = (): CallsProviderDepsT => ({
  auth: {
    useCurrentUser: () => ({
      data: {
        userId: 'demo-user',
        default_layout: 'tutor',
      },
      isLoading: false,
      isError: false,
    }),
  },

  room: {
    useGetClassroom: (id: number) => ({
      data: {
        id,
        name: DEMO_CLASSROOM_NAME,
      },
      isLoading: false,
      isError: false,
    }),
    useAddClassroomMaterials: () => ({
      addClassroomMaterials: async () => ({
        data: { id: String(Date.now()) },
      }),
    }),
    useGetClassroomMaterialsList: () => ({
      data: mockBoards,
      isLoading: false,
      isError: false,
    }),
  },

  callAuth: {
    createTokenByTutor: async () => '',
    createTokenByStudent: async () => '',
    reactivateCall: async () => undefined,
    isLoading: false,
    error: undefined,
  },

  updateParticipantMetadata: {
    updateParticipantMetadata: async () => {},
    isPending: false,
  },

  conferenceMetadata: {
    updateConferenceMetadata: async () => {
      // В демо синхронизация доски через metadata API отключена (нет бэкенда)
    },
  },

  appConfig: {
    getClassroomJoinLink: (classroomId) => {
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      return `${origin}/call/${classroomId}?tab=overview`;
    },
  },
});
