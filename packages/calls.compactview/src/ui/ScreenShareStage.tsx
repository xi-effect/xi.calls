import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { DndContext, type DragEndEvent, useSensor, useSensors } from '@dnd-kit/core';
import { restrictToWindowEdges } from '@dnd-kit/modifiers';
import { ScreenShareIcon, useTracks } from '@livekit/components-react';
import { RemoteTrackPublication, Track } from 'livekit-client';
import { useTranslation } from 'react-i18next';
import {
  ParticipantPinToggle,
  ScreenShareStageToggle,
  ScreenShareZoom,
  VideoTrack,
} from '@xipkg/calls-ui';
import { useCallStore } from '@xipkg/calls-store';
import { Chat } from '@xipkg/calls-chat';
import { COMPACT_PANEL_WIDTH_PX } from '../constants';
import { usePiP } from '../providers';
import { CompactCall } from './CompactCall';
import { CompactPointerSensor, CompactTouchSensor } from './compactDragSensors';

const EDGE_PX = 16;
const STAGE_GONE_MS = 500;

function clampStagePosition(x: number, y: number, width: number, height: number) {
  const maxX = Math.max(EDGE_PX, window.innerWidth - width - EDGE_PX);
  const maxY = Math.max(EDGE_PX, window.innerHeight - height - EDGE_PX);
  return {
    x: Math.min(Math.max(EDGE_PX, x), maxX),
    y: Math.min(Math.max(EDGE_PX, y), maxY),
  };
}

type ScreenShareStagePropsT = {
  identity: string;
};

export const ScreenShareStage = ({ identity }: ScreenShareStagePropsT) => {
  const { t } = useTranslation('calls');
  const updateStore = useCallStore((state) => state.updateStore);
  const closePiP = usePiP()?.closePiP;
  const overlayRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: EDGE_PX, y: EDGE_PX });

  const tracks = useTracks([{ source: Track.Source.ScreenShare, withPlaceholder: false }], {
    onlySubscribed: false,
  });
  const track = tracks.find((item) => item.participant.identity === identity) ?? null;
  const publication = track?.publication;
  const hasTrack = Boolean(publication);

  const sensors = useSensors(
    useSensor(CompactPointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(CompactTouchSensor, { activationConstraint: { distance: 8 } }),
  );

  useEffect(() => {
    closePiP?.();
  }, [closePiP]);

  useEffect(() => {
    if (!(publication instanceof RemoteTrackPublication) || publication.isSubscribed) return;
    publication.setSubscribed(true);
  }, [publication]);

  useEffect(() => {
    if (hasTrack) return undefined;
    const timeoutId = window.setTimeout(() => {
      if (useCallStore.getState().screenShareStageIdentity === identity) {
        useCallStore.getState().updateStore('screenShareStageIdentity', null);
      }
    }, STAGE_GONE_MS);
    return () => window.clearTimeout(timeoutId);
  }, [hasTrack, identity]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      event.preventDefault();
      updateStore('screenShareStageIdentity', null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [updateStore]);

  useEffect(() => {
    const portalNode = overlayRef.current;
    if (!portalNode) return undefined;

    const hidden: HTMLElement[] = [];
    Array.from(document.body.children).forEach((node) => {
      if (!(node instanceof HTMLElement)) return;
      if (node === portalNode || node.contains(portalNode)) return;
      if (node.hasAttribute('data-sonner-toaster')) return;
      if (node.hasAttribute('inert')) return;
      node.setAttribute('inert', '');
      hidden.push(node);
    });

    const { body, documentElement } = document;
    const previousBodyOverflow = body.style.overflow;
    const previousHtmlOverflow = documentElement.style.overflow;
    body.style.overflow = 'hidden';
    documentElement.style.overflow = 'hidden';
    portalNode?.focus();

    return () => {
      hidden.forEach((node) => node.removeAttribute('inert'));
      body.style.overflow = previousBodyOverflow;
      documentElement.style.overflow = previousHtmlOverflow;
    };
  }, []);

  useLayoutEffect(() => {
    const node = panelRef.current;
    if (!node) return undefined;

    const clamp = () => {
      const current = panelRef.current;
      if (!current) return;
      setPosition((prev) => {
        const next = clampStagePosition(prev.x, prev.y, current.offsetWidth, current.offsetHeight);
        if (next.x === prev.x && next.y === prev.y) return prev;
        return next;
      });
    };

    clamp();
    const observer = new ResizeObserver(clamp);
    observer.observe(node);
    window.addEventListener('resize', clamp);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', clamp);
    };
  }, []);

  const handleDragEnd = (event: DragEndEvent) => {
    const node = panelRef.current;
    setPosition((prev) => {
      const next = clampStagePosition(
        prev.x + event.delta.x,
        prev.y + event.delta.y,
        node?.offsetWidth ?? COMPACT_PANEL_WIDTH_PX,
        node?.offsetHeight ?? 320,
      );
      if (next.x === prev.x && next.y === prev.y) return prev;
      return next;
    });
  };

  if (typeof document === 'undefined') return null;

  const sharerName = track?.participant.name;

  return createPortal(
    <div
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-label={t('participant.stageTitle')}
      tabIndex={-1}
      className="screen-share-stage fixed inset-0 z-[2100] bg-black outline-none"
    >
      <div className="relative h-full w-full">
        {track && publication ? (
          <ScreenShareZoom trackRef={track} className="rounded-none">
            <VideoTrack
              trackRef={track}
              manageSubscription={false}
              className="h-full w-full bg-black object-contain"
            />
          </ScreenShareZoom>
        ) : null}
        {track ? (
          <div className="bg-background-surface/80 pointer-events-none absolute bottom-4 left-4 z-20 flex h-6 items-center gap-1.5 rounded-lg px-1.5 py-1 backdrop-blur">
            <ScreenShareIcon style={{ marginRight: '0.25rem' }} />
            <span className="text-xs-base-size text-text-primary leading-[16px]">
              {t('participant.screenSharePrefix')}
              {sharerName ? <>&nbsp;{sharerName}</> : null}
            </span>
          </div>
        ) : null}
        <div className="absolute top-3 right-3 z-40 flex items-center gap-1">
          <ScreenShareStageToggle trackRef={track ?? undefined} inline />
          {track ? <ParticipantPinToggle trackRef={track} inline /> : null}
        </div>
      </div>

      <DndContext
        sensors={sensors}
        onDragEnd={handleDragEnd}
        modifiers={[restrictToWindowEdges]}
        autoScroll={false}
      >
        <div
          ref={panelRef}
          className="absolute z-30 w-max"
          style={{ left: position.x, top: position.y }}
        >
          <CompactCall freeDrag />
        </div>
      </DndContext>

      <Chat compactPositionStyle={{ top: 56, right: 16, bottom: 16, zIndex: 20 }} />
    </div>,
    document.body,
  );
};
