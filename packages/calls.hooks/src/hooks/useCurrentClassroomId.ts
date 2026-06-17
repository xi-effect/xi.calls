import { useCallStore } from '@xipkg/calls-store';
import { useCallsNavigation } from '@xipkg/calls-providers';

/** ID кабинета для привязки локальных pin (маршрут → store → query call) */
export function useCurrentClassroomId(): string | undefined {
  const activeClassroom = useCallStore((state) => state.activeClassroom);
  const navigation = useCallsNavigation();

  return (
    activeClassroom ??
    navigation.params.classroomId ??
    navigation.params.callId ??
    navigation.getCallId()
  );
}
