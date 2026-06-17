import React from 'react';
import type { TrackReferenceOrPlaceholder } from '@livekit/components-core';
import { useMaybeTrackRefContext } from '@livekit/components-react';
import { Pin, Pinned } from '@xipkg/icons';
import { toPinnedParticipant, useCallStore } from '@xipkg/calls-store';
import { useCurrentClassroomId } from '@xipkg/calls-hooks';
import { cn } from '@xipkg/utils';

/** Базовые стили оверлей-кнопки на плитке (для inline-использования, без absolute) */
export const tileOverlayButtonClassName =
  'rounded-lg box-border flex h-6 w-6 min-h-6 min-w-6 shrink-0 cursor-pointer appearance-none items-center justify-center border-none bg-gray-0/80 p-0 text-gray-100 opacity-80';

/**
 * Стили кнопки — как у FocusToggle (absolute внутри плитки).
 * Видимость управляется через CSS-класс lk-pin-toggle-button в grid.css,
 * аналогично lk-focus-toggle-button (Tailwind group-hover не работает в этом контексте).
 */
const pinToggleClassName =
  'lk-pin-toggle-button rounded-lg absolute top-2 z-10 box-border flex h-6 w-6 min-h-6 min-w-6 cursor-pointer appearance-none items-center justify-center border-none bg-gray-0/80 p-0 transition-opacity';

export type ParticipantPinTogglePropsT = {
  trackRef?: TrackReferenceOrPlaceholder;
  /** Рядом с кнопкой фокуса (focus-сетки): пин слева, фокус справа */
  withFocusToggle?: boolean;
  /** Без absolute — для группы кнопок в compact */
  inline?: boolean;
} & React.ButtonHTMLAttributes<HTMLButtonElement>;

export const ParticipantPinToggle = ({
  trackRef,
  withFocusToggle = false,
  inline = false,
  className,
  onClick,
  ...props
}: ParticipantPinTogglePropsT) => {
  const trackRefFromContext = useMaybeTrackRefContext();
  const trackReference = trackRef ?? trackRefFromContext;
  const classroomId = useCurrentClassroomId();

  const togglePinnedParticipant = useCallStore((state) => state.togglePinnedParticipant);
  const isParticipantPinned = useCallStore((state) => state.isParticipantPinned);

  if (!trackReference || !classroomId) return null;

  const pin = toPinnedParticipant(trackReference);
  const isPinned = isParticipantPinned(pin, classroomId);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    togglePinnedParticipant(pin, classroomId);
    onClick?.(event);
  };

  return (
    <button
      type="button"
      className={cn(
        !inline && pinToggleClassName,
        inline && tileOverlayButtonClassName,
        !inline && (withFocusToggle ? 'left-2' : 'right-2'),
        isPinned && inline && 'opacity-100',
        className,
      )}
      aria-label={isPinned ? 'Открепить участника' : 'Закрепить участника'}
      aria-pressed={isPinned}
      onClick={handleClick}
      {...props}
    >
      {isPinned ? (
        <Pinned className="fill-brand-80" style={{ width: 16, height: 16 }} />
      ) : (
        <Pin className="fill-gray-100" style={{ width: 16, height: 16 }} />
      )}
    </button>
  );
};
