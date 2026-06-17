import { useMemo } from 'react';
import type { PinnedParticipantT } from '@xipkg/calls-store';
import { useCallStore } from '@xipkg/calls-store';
import { useCurrentClassroomId } from './useCurrentClassroomId';

export function useClassroomPins(): {
  classroomId: string | undefined;
  pins: PinnedParticipantT[];
} {
  const classroomId = useCurrentClassroomId();
  const pinnedByClassroom = useCallStore((state) => state.pinnedByClassroom);

  const pins = useMemo(
    () => (classroomId ? (pinnedByClassroom[classroomId] ?? []) : []),
    [classroomId, pinnedByClassroom],
  );

  return { classroomId, pins };
}
