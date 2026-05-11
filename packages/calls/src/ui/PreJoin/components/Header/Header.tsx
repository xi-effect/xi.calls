import { useParams } from '@tanstack/react-router';
import { useCalls } from 'calls.providers';

/* eslint-disable no-irregular-whitespace */
export const Header = () => {
  const { callId } = useParams({ strict: false }) as { callId: string };

  const { room } = useCalls();

  const { data: classroom } = room.useGetClassroom(Number(callId));

  return (
    <div className="mb-4 flex flex-row items-center gap-2">
      <h1 className="text-xl-base font-semibold text-gray-100">Присоединиться к занятию</h1>
      <p className="text-s-base text-gray-60 pt-2 align-baseline">{classroom?.name}</p>
    </div>
  );
};
