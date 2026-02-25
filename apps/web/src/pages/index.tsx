import { createFileRoute } from '@tanstack/react-router';
import { Call } from 'calls.main';
import { LiveKitProvider, RoomProvider } from 'calls.providers';

const devDeps = {
  auth: {
    useCurrentUser: () => ({
      data: { userId: 1 },
      isLoading: false,
      isError: false,
    }),
  },

  room: {
    useGetClassroom: () => ({
      data: null,
      isLoading: false,
      isError: false,
    }),
    useAddClassroomMaterials: () => ({
      addClassroomMaterials: () => {},
    }),
    useGetClassroomMaterialsList: () => ({
      data: [],
      isLoading: false,
      isError: false,
    }),
  },

  callAuth: {
    createTokenByTutor: async () => 'dev-token',
    createTokenByStudent: async () => 'dev-token',
    reactivateCall: async () => {},
    isLoading: false,
    error: undefined,
  },
};

export const Route = createFileRoute('/')({
  component: HomePage,
  head: () => ({
    meta: [
      {
        title: 'Home',
      },
    ],
  }),
});

function HomePage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <RoomProvider>
        <LiveKitProvider>
          <Call deps={devDeps} />
        </LiveKitProvider>
      </RoomProvider>
    </div>
  );
}
