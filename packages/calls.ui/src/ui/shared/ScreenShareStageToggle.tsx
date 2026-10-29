import type { MouseEvent, PointerEvent } from 'react';
import type { TrackReferenceOrPlaceholder } from '@livekit/components-core';
import { useMaybeTrackRefContext } from '@livekit/components-react';
import { Maximize, Minimize } from '@xipkg/icons';
import { Track } from 'livekit-client';
import { useCallStore } from '@xipkg/calls-store';
import { cn } from '@xipkg/utils';
import { useTranslation } from 'react-i18next';
import { tileOverlayButtonClassName } from './ParticipantPinToggle';

/**
 * На плитке кнопка прячется до hover, как закреп.
 * В оверлее (compact и полноэкранная демонстрация) она всегда видна.
 */
const stageButtonClassName =
  'lk-screen-share-stage-button rounded-lg relative box-border flex h-6 w-6 min-h-6 min-w-6 shrink-0 cursor-pointer appearance-none items-center justify-center border-none bg-background-surface/90 p-0 text-icon-primary shadow-sm backdrop-blur-sm';

export type ScreenShareStageTogglePropsT = {
  trackRef?: TrackReferenceOrPlaceholder;
  /** Без привязки к hover плитки */
  inline?: boolean;
  className?: string;
};

export const ScreenShareStageToggle = ({
  trackRef,
  inline = false,
  className,
}: ScreenShareStageTogglePropsT) => {
  const { t } = useTranslation('calls');
  const trackRefFromContext = useMaybeTrackRefContext();
  const trackReference = trackRef ?? trackRefFromContext;
  const stageIdentity = useCallStore((state) => state.screenShareStageIdentity);
  const updateStore = useCallStore((state) => state.updateStore);

  if (trackReference && trackReference.source !== Track.Source.ScreenShare) return null;
  if (!trackReference && !stageIdentity) return null;

  const identity = trackReference?.participant.identity;
  const active = identity ? stageIdentity === identity : Boolean(stageIdentity);
  const label = active ? t('participant.exitStage') : t('participant.enterStage');
  const Icon = active ? Minimize : Maximize;

  const stopTileClick = (
    event: PointerEvent<HTMLButtonElement> | MouseEvent<HTMLButtonElement>,
  ) => {
    event.stopPropagation();
  };

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (active || !identity) {
      updateStore('screenShareStageIdentity', null);
      return;
    }
    updateStore('screenShareStageIdentity', identity);
  };

  return (
    <button
      type="button"
      className={cn(inline ? tileOverlayButtonClassName : stageButtonClassName, className)}
      aria-label={label}
      title={label}
      aria-pressed={active}
      onPointerDown={stopTileClick}
      onClick={handleClick}
    >
      <Icon
        className={active ? 'fill-icon-brand' : 'fill-icon-primary'}
        style={{ width: 16, height: 16 }}
      />
    </button>
  );
};
