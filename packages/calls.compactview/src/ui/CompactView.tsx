import { FC, useEffect, useRef, useState, type CSSProperties } from 'react';
import {
  DndContext,
  DragEndEvent,
  useSensor,
  useSensors,
  useDroppable,
  DragOverlay,
  useDndMonitor,
} from '@dnd-kit/core';
import { CompactPointerSensor, CompactTouchSensor } from './compactDragSensors';
import { useCallsNavigation } from '@xipkg/calls-providers';
import { restrictToWindowEdges } from '@dnd-kit/modifiers';
import { CompactCall } from './CompactCall';
import { Chat, useChatStore } from '@xipkg/calls-chat';
import { PermissionsDialog } from '@xipkg/calls-ui';
import { useCallStore } from '@xipkg/calls-store';
import type { CornerT } from '@xipkg/calls-store';
import { usePhoneLayout } from '@xipkg/calls-utils';
import { useRoom } from '@xipkg/calls-providers';
import { PiPProvider, usePiP } from '../providers';
import { useParticipantSounds, useParticipantJoinSync } from '@xipkg/calls-hooks';
import { COMPACT_MOBILE_CONTENT_GAP_PX, COMPACT_MOBILE_OVERLAY_FALLBACK_PX } from '../constants';
import { chatPositionStyle, cornerStyle, useBoardChromeInsets } from '../boardChromeInsets';
import { ScreenShareStage } from './ScreenShareStage';

type CompactViewPropsT = {
  children: React.ReactNode;
};

const useCompactDragActive = () => {
  const [isDragging, setIsDragging] = useState(false);

  useDndMonitor({
    onDragStart: () => {
      setIsDragging(true);
    },
    onDragEnd: () => {
      setIsDragging(false);
    },
    // На планшете жест часто отменяется (pointercancel / resize), а не завершается.
    // Без этого бирюзовые зоны остаются, хотя перенос уже мёртв.
    onDragCancel: () => {
      setIsDragging(false);
    },
  });

  return isDragging;
};

const DroppableCorner = ({ id, style }: { id: string; style: CSSProperties }) => {
  const { setNodeRef } = useDroppable({
    id,
  });
  const isDragging = useCompactDragActive();

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`pointer-events-none absolute z-20 size-1/3 transition-all duration-200 ${
        isDragging ? 'bg-status-info-background/20 ring-border-selected rounded-lg ring-2' : ''
      }`}
    />
  );
};

const DroppableAreas: FC<{ insets: ReturnType<typeof useBoardChromeInsets> }> = ({ insets }) => {
  const isDragging = useCompactDragActive();

  return (
    <>
      <DroppableCorner id="top-left" style={cornerStyle('top-left', insets)} />
      <DroppableCorner id="top-right" style={cornerStyle('top-right', insets)} />
      <DroppableCorner id="bottom-left" style={cornerStyle('bottom-left', insets)} />
      <DroppableCorner id="bottom-right" style={cornerStyle('bottom-right', insets)} />
      {/* Превью не должно перехватывать касание: на планшете слой под пальцем отменяет жест. */}
      <DragOverlay style={{ pointerEvents: 'none' }}>
        {isDragging ? <CompactCall /> : null}
      </DragOverlay>
    </>
  );
};

type CompactPropsT = CompactViewPropsT & {
  /** При true не рендерить оверлей (звонок, чат, углы). Используется при PiP, чтобы children не размонтировались. */
  hideOverlay?: boolean;
};

export const Compact: FC<CompactPropsT> = ({ children, hideOverlay = false }) => {
  const navigation = useCallsNavigation();
  const { activeCorner, updateStore } = useCallStore();
  const isMobile = usePhoneLayout();
  const headerRef = useRef<HTMLDivElement>(null);
  const [headerHeight, setHeaderHeight] = useState(0);

  useEffect(() => {
    if (!isMobile || hideOverlay || !headerRef.current) return;
    const el = headerRef.current;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) setHeaderHeight(entry.contentRect.height);
    });
    observer.observe(el);
    setHeaderHeight(el.getBoundingClientRect().height);
    return () => observer.disconnect();
  }, [isMobile, hideOverlay]);

  const sensors = useSensors(
    useSensor(CompactPointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(CompactTouchSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { over } = event;
    if (over) {
      updateStore('activeCorner', over.id as CornerT);
    }
  };

  const isBoardPage = navigation.pathnameIncludes('/board');
  const insets = useBoardChromeInsets(isBoardPage);

  const mobileContentMarginTop =
    hideOverlay || !isMobile
      ? 0
      : (headerHeight > 0 ? headerHeight : COMPACT_MOBILE_OVERLAY_FALLBACK_PX) +
        COMPACT_MOBILE_CONTENT_GAP_PX;

  const container = (
    <div className={`relative flex h-dvh flex-col bg-transparent`} data-board-chrome-aware="">
      {isMobile ? (
        <>
          {!hideOverlay && (
            <div ref={headerRef} className="fixed top-2 right-0 left-0 z-10 w-full px-2">
              <CompactCall withOutShadows />
            </div>
          )}
          <div
            className="flex min-h-0 flex-1 flex-col"
            style={{ marginTop: mobileContentMarginTop }}
          >
            {children}
          </div>
        </>
      ) : (
        <>
          {!hideOverlay && (
            <>
              <DroppableAreas insets={insets} />
              <Chat compactPositionStyle={chatPositionStyle(activeCorner, insets)} />
              <div
                className="absolute z-20 transition-all duration-500 ease-out"
                style={cornerStyle(activeCorner, insets)}
              >
                <CompactCall />
              </div>
            </>
          )}
          {children}
        </>
      )}
    </div>
  );

  // Всегда один и тот же корень (DndContext), иначе при hideOverlay React размонтирует
  // container и всё дерево доски (YjsProvider пересоздаётся → белый экран).
  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd} modifiers={[restrictToWindowEdges]}>
      {container}
    </DndContext>
  );
};

const CompactViewInner = ({ children }: CompactViewPropsT) => {
  const { mode, token } = useCallStore();
  const screenShareStageIdentity = useCallStore((state) => state.screenShareStageIdentity);
  const isStarted = useCallStore((state) => state.isStarted);
  const { room } = useRoom();
  const pip = usePiP();
  const isPiPActive = !!pip?.isPiPActive;

  // Синхронизация состояния при подключении новых участников (работает и в compact mode)
  useParticipantJoinSync();
  useParticipantSounds();

  useEffect(() => {
    if (!screenShareStageIdentity) return;
    if (!room || !token || !isStarted) {
      useCallStore.getState().updateStore('screenShareStageIdentity', null);
    }
  }, [isStarted, room, screenShareStageIdentity, token]);

  const navigation = useCallsNavigation();
  const { updateStore: updateChatStore } = useChatStore();

  useEffect(() => {
    const { activeClassroom } = useCallStore.getState();
    const isOnBoardPage = navigation.pathnameIncludes('/board');

    if ((!room || !token) && navigation.search.call && !isOnBoardPage && !activeClassroom) {
      navigation.clearCallSearchParam();

      // Очищаем все состояния интерфейса при отключении
      const { clearAllRaisedHands, updateStore: updateCallStore } = useCallStore.getState();
      // Очищаем поднятые руки
      clearAllRaisedHands();

      // Очищаем чат
      updateChatStore('isChatOpen', false);
      updateChatStore('chatMessages', []);
      updateChatStore('unreadMessagesCount', 0);

      // Очищаем информацию о доске при отключении
      updateCallStore('activeBoardId', undefined);
      updateCallStore('activeClassroom', undefined);

      updateCallStore('mode', 'full');
    }
  }, [room, token, navigation, updateChatStore]);

  const contentWrapper = (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  );

  if (!room || !token) {
    return (
      <>
        {contentWrapper}
        <PermissionsDialog />
      </>
    );
  }

  const stageLayer =
    screenShareStageIdentity && room && token && isStarted ? (
      <ScreenShareStage key={screenShareStageIdentity} identity={screenShareStageIdentity} />
    ) : null;

  if (mode === 'full') {
    return (
      <>
        {contentWrapper}
        {stageLayer}
        <PermissionsDialog />
      </>
    );
  }

  // Всегда один и тот же Compact — при PiP только скрываем оверлей (hideOverlay).
  return (
    <>
      <Compact hideOverlay={isPiPActive || Boolean(screenShareStageIdentity)}>{children}</Compact>
      {stageLayer}
      <PermissionsDialog />
    </>
  );
};

export const CompactView = ({ children }: CompactViewPropsT) => (
  <PiPProvider>
    <CompactViewInner>{children}</CompactViewInner>
  </PiPProvider>
);
