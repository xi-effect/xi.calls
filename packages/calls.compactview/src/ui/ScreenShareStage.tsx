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
import { usePiP } from '../providers';
import { CompactCall } from './CompactCall';
import { CompactPointerSensor, CompactTouchSensor } from './compactDragSensors';
import {
  clampStagePosition,
  computeStageFrame,
  defaultStagePosition,
  sameStageFrame,
  stagePanelHeight,
  type StageFrame,
} from './stageLayout';

const STAGE_GONE_MS = 500;

function initialStageFrame(): StageFrame {
  if (typeof window === 'undefined') {
    return {
      handheld: false,
      landscape: false,
      lockCompactModes: false,
      width: 400,
      tileHeight: 225,
      insets: { top: 0, right: 0, bottom: 0, left: 0 },
    };
  }
  return computeStageFrame();
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
  const movedRef = useRef(false);
  const landscapeRef = useRef<boolean | null>(null);
  const [frame, setFrame] = useState(initialStageFrame);
  const [position, setPosition] = useState(() => defaultStagePosition(initialStageFrame()));

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
    const sync = () => {
      const next = computeStageFrame();
      setFrame((prev) => (sameStageFrame(prev, next) ? prev : next));
      const flipped = landscapeRef.current !== null && landscapeRef.current !== next.landscape;
      landscapeRef.current = next.landscape;
      if (flipped) movedRef.current = false;

      setPosition((prev) => {
        if (!movedRef.current) {
          const placed = defaultStagePosition(next);
          if (placed.x === prev.x && placed.y === prev.y) return prev;
          return placed;
        }
        const node = panelRef.current;
        const clamped = clampStagePosition(
          prev.x,
          prev.y,
          node?.offsetWidth ?? next.width,
          node?.offsetHeight ?? stagePanelHeight(next),
          next.insets,
        );
        if (clamped.x === prev.x && clamped.y === prev.y) return prev;
        return clamped;
      });
    };

    sync();
    const viewport = window.visualViewport;
    window.addEventListener('resize', sync);
    window.addEventListener('orientationchange', sync);
    viewport?.addEventListener('resize', sync);
    viewport?.addEventListener('scroll', sync);
    const node = panelRef.current;
    const observer = new ResizeObserver(sync);
    if (node) observer.observe(node);
    return () => {
      window.removeEventListener('resize', sync);
      window.removeEventListener('orientationchange', sync);
      viewport?.removeEventListener('resize', sync);
      viewport?.removeEventListener('scroll', sync);
      observer.disconnect();
    };
  }, []);

  const handleDragEnd = (event: DragEndEvent) => {
    movedRef.current = true;
    const node = panelRef.current;
    const current = computeStageFrame();
    setPosition((prev) => {
      const next = clampStagePosition(
        prev.x + event.delta.x,
        prev.y + event.delta.y,
        node?.offsetWidth ?? current.width,
        node?.offsetHeight ?? stagePanelHeight(current),
        current.insets,
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
          frame.handheld ? (
            <div className="absolute inset-0 flex items-center justify-center bg-black">
              <VideoTrack
                trackRef={track}
                manageSubscription={false}
                className="h-full w-full bg-black object-contain"
              />
            </div>
          ) : (
            <ScreenShareZoom trackRef={track} className="rounded-none">
              <VideoTrack
                trackRef={track}
                manageSubscription={false}
                className="h-full w-full bg-black object-contain"
              />
            </ScreenShareZoom>
          )
        ) : null}
        {track ? (
          <div
            className="bg-background-surface/80 pointer-events-none absolute z-20 flex h-6 max-w-[calc(100%-96px)] items-center gap-1.5 rounded-lg px-1.5 py-1 backdrop-blur"
            style={
              frame.handheld
                ? {
                    top: 'max(12px, env(safe-area-inset-top))',
                    left: 'max(12px, env(safe-area-inset-left))',
                  }
                : {
                    bottom: 'max(16px, env(safe-area-inset-bottom))',
                    left: 'max(16px, env(safe-area-inset-left))',
                  }
            }
          >
            <ScreenShareIcon style={{ marginRight: '0.25rem' }} />
            <span className="text-xs-base-size text-text-primary truncate leading-[16px]">
              {t('participant.screenSharePrefix')}
              {sharerName ? <>&nbsp;{sharerName}</> : null}
            </span>
          </div>
        ) : null}
        <div
          className="absolute z-40 flex items-center gap-1"
          style={{
            top: 'max(12px, env(safe-area-inset-top))',
            right: 'max(12px, env(safe-area-inset-right))',
          }}
        >
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
          <CompactCall
            freeDrag
            stageFrame={
              frame.handheld
                ? {
                    width: frame.width,
                    tileHeight: frame.tileHeight,
                    lockCompactModes: frame.lockCompactModes,
                  }
                : null
            }
          />
        </div>
      </DndContext>

      <Chat
        forceSheet={frame.handheld}
        compactPositionStyle={
          frame.handheld ? undefined : { top: 56, right: 16, bottom: 16, zIndex: 20 }
        }
      />
    </div>,
    document.body,
  );
};
