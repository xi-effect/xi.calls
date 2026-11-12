import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import { useTrackVolume } from '@livekit/components-react';
import type { LocalAudioTrack } from 'livekit-client';
import { Button } from '@xipkg/button';
import { cn } from '@xipkg/utils';

const LONG_PRESS_MS = 500;

type MobileMediaButtonProps = {
  label: string;
  enabled: boolean;
  permissionBlocked: boolean;
  onToggle: () => void;
  onLongPress: () => void;
  className?: string;
  umamiEvent: string;
  /** Трек микрофона: по нему рисуется уровень громкости. */
  audioTrack?: LocalAudioTrack;
  children: ReactNode;
};

export const MobileMediaButton = ({
  label,
  enabled,
  permissionBlocked,
  onToggle,
  onLongPress,
  className,
  umamiEvent,
  audioTrack,
  children,
}: MobileMediaButtonProps) => {
  const trackVolume = useTrackVolume(audioTrack);
  const volume = audioTrack ? Math.round(trackVolume * 100) : undefined;
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressFiredRef = useRef(false);
  const suppressClickRef = useRef(false);
  const [holding, setHolding] = useState(false);

  const clearLongPressTimer = () => {
    if (longPressTimerRef.current != null) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  useEffect(
    () => () => {
      if (longPressTimerRef.current != null) clearTimeout(longPressTimerRef.current);
    },
    [],
  );

  const endPress = () => {
    clearLongPressTimer();
    setHolding(false);
    if (longPressFiredRef.current) suppressClickRef.current = true;
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return;
    longPressFiredRef.current = false;
    clearLongPressTimer();
    setHolding(true);
    event.currentTarget.setPointerCapture(event.pointerId);
    longPressTimerRef.current = setTimeout(() => {
      longPressTimerRef.current = null;
      longPressFiredRef.current = true;
      onLongPress();
    }, LONG_PRESS_MS);
  };

  const onClick = () => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    onToggle();
  };

  const showLevel = volume != null && enabled && !permissionBlocked;

  return (
    <Button
      type="button"
      variant="none"
      aria-label={label}
      aria-pressed={enabled}
      className={cn(
        'touch-manipulation select-none [-webkit-touch-callout:none]',
        className,
        holding && 'bg-background-page',
        permissionBlocked &&
          'border-border-error bg-status-error-background hover:bg-status-error-background border-2',
        !permissionBlocked &&
          enabled &&
          volume == null &&
          'bg-status-success-background hover:bg-status-success-background',
      )}
      style={
        showLevel
          ? {
              background: `linear-gradient(to top, var(--xi-green-20) 0%, transparent ${volume}%)`,
            }
          : undefined
      }
      data-umami-event={umamiEvent}
      data-umami-event-state={enabled ? 'on' : 'off'}
      onPointerDown={onPointerDown}
      onPointerUp={endPress}
      onPointerCancel={endPress}
      onContextMenu={(event) => event.preventDefault()}
      onClick={onClick}
    >
      {children}
    </Button>
  );
};
