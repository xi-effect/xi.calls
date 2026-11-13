import { useCallback, useEffect, useRef } from 'react';
import { RoomEvent } from 'livekit-client';
import type { Room } from 'livekit-client';
import { useCallStore } from '@xipkg/calls-store';
import {
  useCalls,
  useRoom,
  useCallsNavigation,
  isOnSharedMaterial,
  isSharedMaterialPath,
  navigateToSharedMaterial,
  type ActiveMaterialT,
  type SharedMaterialKindT,
} from '@xipkg/calls-providers';

/** Один раз за сессию комнаты применяем начальные метаданные (чтобы при монтировании второго CompactCall в DragOverlay не редиректило) */
const initialMetadataAppliedForRoomRef = { current: null as Room | null };

/** Метаданные комнаты с бэкенда (обновляются через PUT .../metadata/) */
type RoomMetadataPayloadT = {
  active_material?: {
    id?: unknown;
    content_kind?: unknown;
  } | null;
  active_classroom_id?: string;
};

const parseActiveMaterial = (
  value: RoomMetadataPayloadT['active_material'],
): ActiveMaterialT | null => {
  if (!value || typeof value !== 'object') return null;
  const id = typeof value.id === 'string' ? value.id.trim() : '';
  if (!id) return null;
  if (value.content_kind !== 'board' && value.content_kind !== 'note') return null;
  return { id, content_kind: value.content_kind };
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

/**
 * Общая логика вычисления mode/board из метаданных комнаты + функция рассылки изменений.
 * Вынесена отдельно, чтобы `useSyncModeToOthers` могла переиспользовать `syncModeToOthers`,
 * не регистрируя второй раз слушатель `RoomEvent.RoomMetadataChanged` (см. ниже).
 */
const useModeSyncCore = () => {
  const navigation = useCallsNavigation();
  const { conferenceMetadata } = useCalls();
  const updateStore = useCallStore((state) => state.updateStore);

  const classroomIdFromRoute =
    navigation.params.callId ?? navigation.params.classroomId ?? navigation.getCallId();

  const applyRoomMetadata = useCallback(
    (metadata: string | undefined) => {
      const payload = parseRoomMetadata(metadata);
      if (!payload) return;

      const activeMaterial = parseActiveMaterial(payload.active_material);
      const metadataClassroomId = payload.active_classroom_id;

      const currentActiveClassroom = useCallStore.getState().activeClassroom;
      const targetClassroom = metadataClassroomId ?? currentActiveClassroom ?? classroomIdFromRoute;

      if (!activeMaterial) {
        const isOnMaterialPage = isSharedMaterialPath(navigation.pathname);
        if (
          !isOnMaterialPage &&
          (navigation.isOnClassroomOverviewWithActiveCall() ||
            navigation.isOnOtherPageWithCompactCall())
        ) {
          return;
        }

        updateStore('localFullView', false);
        updateStore('mode', 'full');
        updateStore('activeBoardId', undefined);
        updateStore('activeMaterialKind', undefined);
        updateStore('activeClassroom', undefined);

        if (targetClassroom) {
          navigation.navigateToCall(targetClassroom);
        }
      } else {
        updateStore('activeBoardId', activeMaterial.id);
        updateStore('activeMaterialKind', activeMaterial.content_kind);
        updateStore(
          'activeClassroom',
          targetClassroom ?? metadataClassroomId ?? currentActiveClassroom,
        );

        const localFullView = useCallStore.getState().localFullView;
        if (localFullView) return;

        const isAlreadyOnTarget = isOnSharedMaterial(
          navigation,
          activeMaterial.id,
          targetClassroom,
          activeMaterial.content_kind,
        );

        updateStore('mode', 'compact');
        if (!isAlreadyOnTarget) {
          navigateToSharedMaterial(
            navigation,
            activeMaterial.id,
            targetClassroom,
            activeMaterial.content_kind,
          );
        }
      }
    },
    [updateStore, navigation, classroomIdFromRoute],
  );

  const syncModeToOthers = useCallback(
    (
      mode: 'compact' | 'full',
      materialId?: string,
      classroom?: string,
      contentKind: SharedMaterialKindT = 'board',
    ) => {
      try {
        if (!mode || !['compact', 'full'].includes(mode)) {
          console.error('❌ Invalid mode for sync:', mode);
          return;
        }

        if (materialId && typeof materialId !== 'string') {
          console.error('❌ Invalid material id for sync:', materialId);
          return;
        }

        const classroomId = classroom ?? useCallStore.getState().activeClassroom;
        if (!classroomId) {
          console.error('❌ classroom_id required to update conference metadata');
          return;
        }

        if (mode === 'full') {
          updateStore('activeMaterialKind', undefined);
          void conferenceMetadata.updateConferenceMetadata({
            classroom_id: classroomId,
            active_material: null,
          });
          return;
        }

        if (!materialId) return;

        updateStore('activeBoardId', materialId);
        updateStore('activeMaterialKind', contentKind);
        updateStore('activeClassroom', classroom);

        void conferenceMetadata.updateConferenceMetadata({
          classroom_id: classroomId,
          active_material: { id: materialId, content_kind: contentKind },
        });
      } catch (error) {
        console.error('❌ Error syncing mode via API:', error);
      }
    },
    [conferenceMetadata, updateStore],
  );

  return {
    applyRoomMetadata,
    syncModeToOthers,
  };
};

/**
 * Полная синхронизация режима: слушает `RoomEvent.RoomMetadataChanged` и применяет
 * изменения (mode/board/навигация), плюс отдаёт `syncModeToOthers` для рассылки своих
 * изменений. Должен монтироваться ОДИН раз на приложение — уже сделано в `ModeSyncProvider`.
 * Компонентам, которым нужен только `syncModeToOthers` (например кнопки "на доску" /
 * выбор материала), следует использовать `useSyncModeToOthers`, а не этот хук: повторная
 * регистрация слушателя метаданных приводит к тому, что каждое изменение обрабатывается
 * несколько раз (лишние updateStore/навигации), что усиливает гонки при переключении
 * в compact-режим при нескольких участниках.
 */
export const useModeSync = () => {
  const { room } = useRoom();
  const { applyRoomMetadata, syncModeToOthers } = useModeSyncCore();

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

  return {
    syncModeToOthers,
  };
};

/** Только рассылка своего изменения режима другим участникам, без повторной подписки
 * на события комнаты (см. комментарий к `useModeSync` выше). */
export const useSyncModeToOthers = () => {
  const { syncModeToOthers } = useModeSyncCore();
  return syncModeToOthers;
};
