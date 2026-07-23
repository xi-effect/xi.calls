/* eslint-disable @typescript-eslint/no-explicit-any */
import { TrackToggleProps, useTrackVolume } from '@livekit/components-react';
import { Track, LocalAudioTrack, LocalVideoTrack } from 'livekit-client';
import { motion } from 'framer-motion';
import {
  MicrophoneOff,
  Microphone,
  Conference,
  CameraOff,
  Screenshare,
  RedLine,
} from '@xipkg/icons';
import { useMemo } from 'react';
import { cn } from '@xipkg/utils';
import { useCannotUseDevice } from '@xipkg/calls-hooks';
import { openPermissionsDialog } from '@xipkg/calls-store';

interface ExtendedTrackToggleProps extends TrackToggleProps<any> {
  microTrack?: LocalAudioTrack;
  videoTrack?: LocalVideoTrack;
  screenShareTrack?: LocalVideoTrack;
  microEnabled?: boolean;
  videoEnabled?: boolean;
  screenShareEnabled?: boolean;
  showIcon?: boolean;
  className?: string;
}

export const TrackToggle = ({
  microTrack,
  videoTrack,
  screenShareTrack,
  microEnabled,
  videoEnabled,
  screenShareEnabled,
  source,
  showIcon = true,
  onChange,
  className,
  ...props
}: ExtendedTrackToggleProps) => {
  const isMicPermissionBlocked = useCannotUseDevice('audioinput');
  const isCameraPermissionBlocked = useCannotUseDevice('videoinput');
  const permissionBlocked =
    source === Track.Source.Microphone
      ? isMicPermissionBlocked
      : source === Track.Source.Camera
        ? isCameraPermissionBlocked
        : false;

  // Для PreJoin используем собственную логику, так как useTrackToggle работает с треками в комнате
  const track =
    source === Track.Source.Microphone
      ? microTrack
      : source === Track.Source.Camera
        ? videoTrack
        : source === Track.Source.ScreenShare
          ? screenShareTrack
          : undefined;
  const enabled =
    source === Track.Source.Microphone
      ? microEnabled
      : source === Track.Source.Camera
        ? videoEnabled
        : source === Track.Source.ScreenShare
          ? screenShareEnabled
          : false;

  const toggle = () => {
    if (permissionBlocked) {
      openPermissionsDialog();
      return;
    }
    if (track) {
      const wasMuted = track.isMuted;
      const newEnabled = wasMuted;
      if (wasMuted) {
        track.unmute();
      } else {
        track.mute();
      }
      onChange?.(newEnabled, true);
    } else {
      onChange?.(!enabled, true);
    }
  };

  const trackVol = useTrackVolume(microTrack);

  const volume = Math.round(trackVol * 100);

  // При отсутствии разрешений показываем перечёркнутый значок (как выключенный)
  const iconEnabled = enabled && !permissionBlocked;

  const icon = useMemo(() => {
    switch (source) {
      case Track.Source.Microphone:
        return iconEnabled ? (
          <Microphone className="fill-status-success-text" />
        ) : (
          <div className="relative flex items-center justify-center">
            <MicrophoneOff className="absolute" />
            <RedLine className="fill-icon-danger absolute" />
          </div>
        );
      case Track.Source.Camera:
        return iconEnabled ? (
          <Conference className="fill-status-success-text" />
        ) : (
          <div className="relative flex items-center justify-center">
            <CameraOff className="absolute" />
            <RedLine className="fill-icon-danger absolute" />
          </div>
        );
      case Track.Source.ScreenShare:
        return enabled ? (
          <Screenshare className="fill-status-success-text" />
        ) : (
          <Screenshare className="fill-icon-primary" />
        );
      default:
        return null;
    }
  }, [source, iconEnabled, enabled]);

  const handleClick = () => {
    toggle();
  };

  const errorIndicator = permissionBlocked ? (
    <span
      className="bg-status-error-accent text-xxs-base-size absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded leading-none font-bold text-white"
      aria-hidden
    >
      !
    </span>
  ) : null;

  const buttonContent = (
    <>
      {showIcon && icon}
      {errorIndicator}
      {props.children}
    </>
  );

  const permissionBlockedStyles = permissionBlocked
    ? 'bg-status-error-background border-2 border-border-error shadow-[inset_0_0_0_1px_rgba(255,255,255,0.6)] hover:bg-status-error-background'
    : '';

  if (source === Track.Source.Microphone) {
    return (
      <motion.button
        type="button"
        onClick={handleClick}
        className={cn(
          'relative flex h-10 w-10 items-center justify-center rounded-xl transition-colors',
          !permissionBlocked && 'bg-background-surface hover:bg-background-page',
          permissionBlockedStyles,
          className,
        )}
        animate={{
          background:
            !permissionBlocked && iconEnabled
              ? `linear-gradient(to top, var(--xi-green-20) 0%, transparent ${volume}%)`
              : undefined,
        }}
        style={{
          background:
            !permissionBlocked && iconEnabled
              ? `linear-gradient(to top, var(--xi-green-20) 0%, transparent ${volume}%)`
              : undefined,
        }}
        transition={{ duration: 1 }}
        data-umami-event="call-toggle-microphone"
        data-umami-event-state={enabled ? 'on' : 'off'}
        {...(props as unknown as any)}
      >
        {buttonContent}
      </motion.button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        'relative flex h-10 w-10 items-center justify-center rounded-xl transition-colors',
        !permissionBlocked && 'bg-background-surface hover:bg-background-page',
        !permissionBlocked &&
          iconEnabled &&
          'bg-status-success-background hover:bg-status-success-background',
        permissionBlockedStyles,
        className,
      )}
      data-umami-event={
        source === Track.Source.Camera
          ? 'call-toggle-camera'
          : source === Track.Source.ScreenShare
            ? 'call-toggle-screenshare'
            : 'call-toggle-track'
      }
      data-umami-event-state={enabled ? 'on' : 'off'}
      {...props}
    >
      {buttonContent}
    </button>
  );
};
