import { useCallback, useEffect, useRef } from 'react';
import { RoomEvent } from 'livekit-client';
import type { Room } from 'livekit-client';
import { useCallStore } from '@xipkg/calls-store';
import { useCalls, useRoom, useCallsNavigation } from '@xipkg/calls-providers';

/** Один раз за сессию комнаты применяем начальные метаданные (чтобы при монтировании второго CompactCall в DragOverlay не редиректило) */
const initialMetadataAppliedForRoomRef = { current: null as Room | null };

/** Метаданные комнаты с бэкенда (обновляются через PUT .../metadata/) */
type RoomMetadataPayloadT = {
  active_material_id?: number;
  active_classroom_id?: string;
};

const parseRoomMetadata = (metadata: string | undefined): RoomMetadataPayloadT | null => {
  if (!metadata || metadata.trim() === '') return null;
  try {
    const parsed = JSON.parse(metadata) as RoomMetadataPayloadT;
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
};

export const useModeSync = () => {
  const navigation = useCallsNavigation();
  const { room } = useRoom();
  const { conferenceMetadata } = useCalls();
  const updateStore = useCallStore((state) => state.updateStore);

  const classroomIdFromRoute =
    navigation.params.callId ?? navigation.params.classroomId ?? navigation.getCallId();

  const applyRoomMetadata = useCallback(
    (metadata: string | undefined) => {
      const payload = parseRoomMetadata(metadata);
      if (!payload) return;

      const activeMaterialId =
        payload.active_material_id !== undefined ? payload.active_material_id : null;
      const metadataClassroomId = payload.active_classroom_id;

      const currentActiveClassroom = useCallStore.getState().activeClassroom;
      const targetClassroom = metadataClassroomId ?? currentActiveClassroom ?? classroomIdFromRoute;

      if (activeMaterialId === 0 || activeMaterialId === null) {
        if (
          navigation.isOnClassroomOverviewWithActiveCall() ||
          navigation.isOnOtherPageWithCompactCall()
        ) {
          return;
        }

        updateStore('localFullView', false);
        updateStore('mode', 'full');
        updateStore('activeBoardId', undefined);
        updateStore('activeClassroom', undefined);

        if (targetClassroom) {
          navigation.navigateToCall(targetClassroom);
        }
      } else {
        const boardId = String(activeMaterialId);
        updateStore('activeBoardId', boardId);
        updateStore(
          'activeClassroom',
          targetClassroom ?? metadataClassroomId ?? currentActiveClassroom,
        );

        const localFullView = useCallStore.getState().localFullView;
        if (localFullView) return;

        const isAlreadyOnTargetBoard =
          targetClassroom &&
          navigation.params.classroomId === targetClassroom &&
          navigation.params.boardId === boardId;

        updateStore('mode', 'compact');
        if (targetClassroom && !isAlreadyOnTargetBoard) {
          navigation.navigateToClassroomBoard(targetClassroom, boardId);
        } else if (!targetClassroom && navigation.params.boardId !== boardId) {
          navigation.navigateToBoard(boardId);
        }
      }
    },
    [updateStore, navigation, classroomIdFromRoute],
  );

  const applyRoomMetadataRef = useRef(applyRoomMetadata);
  applyRoomMetadataRef.current = applyRoomMetadata;

  useEffect(() => {
    if (!room) return;

    const handleRoomMetadataChanged = (metadata: string | undefined) => {
      applyRoomMetadataRef.current(metadata);
    };

    room.on(RoomEvent.RoomMetadataChanged, handleRoomMetadataChanged);

    if (room.metadata && initialMetadataAppliedForRoomRef.current !== room) {
      initialMetadataAppliedForRoomRef.current = room;
      applyRoomMetadataRef.current(room.metadata);
    }

    return () => {
      room.off(RoomEvent.RoomMetadataChanged, handleRoomMetadataChanged);
    };
  }, [room]);

  const syncModeToOthers = useCallback(
    (mode: 'compact' | 'full', boardId?: string, classroom?: string) => {
      try {
        if (!mode || !['compact', 'full'].includes(mode)) {
          console.error('❌ Invalid mode for sync:', mode);
          return;
        }

        if (boardId && typeof boardId !== 'string') {
          console.error('❌ Invalid boardId for sync:', boardId);
          return;
        }

        const classroomId = classroom ?? useCallStore.getState().activeClassroom;
        if (!classroomId) {
          console.error('❌ classroom_id required to update conference metadata');
          return;
        }

        const active_material_id = mode === 'full' ? 0 : Number(boardId);

        if (mode === 'compact' && boardId) {
          updateStore('activeBoardId', boardId);
          updateStore('activeClassroom', classroom);
        }

        void conferenceMetadata.updateConferenceMetadata({
          classroom_id: classroomId,
          active_material_id,
        });
      } catch (error) {
        console.error('❌ Error syncing mode via API:', error);
      }
    },
    [conferenceMetadata, updateStore],
  );

  return {
    syncModeToOthers,
  };
};
