import { Avatar, AvatarFallback, AvatarImage } from '@xipkg/avatar';
import { useMemo, useRef, useEffect, useState } from 'react';
import { facingModeFromLocalTrack, LocalVideoTrack, LocalAudioTrack } from 'livekit-client';
import { Controls } from './Controls';
import { useCannotUseDevice, usePersistentUserChoices } from '@xipkg/calls-hooks';
import { openPermissionsDialog } from '@xipkg/calls-store';
import { Button } from '@xipkg/button';
import { SecureVideo } from '@xipkg/calls-ui';
import { Settings } from '@xipkg/icons';
import { isSafari } from '@xipkg/calls-utils';
import { useCalls } from '@xipkg/calls-providers';
import { useTranslation } from 'react-i18next';

const UserTileUI = ({
  audioTrack,
  videoTrack,
  videoEnabled,
  facingMode,
  videoEl,
  userId,
  isCameraDeniedOrPrompted,
  isMicrophoneDeniedOrPrompted,
  isVideoInitiated,
  mirrorVideo,
}: {
  audioTrack?: LocalAudioTrack;
  videoTrack?: LocalVideoTrack;
  videoEnabled: boolean;
  facingMode: string;
  videoEl: React.RefObject<HTMLVideoElement | null>;
  userId: string;
  isCameraDeniedOrPrompted: boolean;
  isMicrophoneDeniedOrPrompted: boolean;
  isVideoInitiated: boolean;
  mirrorVideo: boolean;
}) => {
  const { t } = useTranslation('calls');
  const isPermissionsBlocked = isCameraDeniedOrPrompted || isMicrophoneDeniedOrPrompted;

  const hintMessage = useMemo(() => {
    if (isPermissionsBlocked) {
      return null;
    }
    if (isCameraDeniedOrPrompted) {
      return isMicrophoneDeniedOrPrompted
        ? t('preJoin.hint.cameraAndMicDenied')
        : t('preJoin.hint.cameraDenied');
    }
    if (!videoEnabled) {
      return t('preJoin.hint.cameraOff');
    }
    if (!isVideoInitiated) {
      return t('preJoin.hint.cameraStarting');
    }
    if (videoTrack && videoEnabled) {
      return '';
    }
    return t('preJoin.hint.cameraUnavailable');
  }, [
    t,
    videoTrack,
    videoEnabled,
    isCameraDeniedOrPrompted,
    isMicrophoneDeniedOrPrompted,
    isVideoInitiated,
    isPermissionsBlocked,
  ]);

  const permissionsInstructions = useMemo(() => {
    if (isSafari()) {
      const origin =
        typeof window !== 'undefined'
          ? (window.location?.origin?.replace('https://', '') ?? '')
          : '';
      return [t('preJoin.permissions.safariStep1', { origin }), t('preJoin.permissions.step2')];
    }
    return [t('preJoin.permissions.chromeStep1'), t('preJoin.permissions.step2')];
  }, [t]);

  const permissionsButtonLabel = useMemo(() => {
    if (!isMicrophoneDeniedOrPrompted && !isCameraDeniedOrPrompted) {
      return null;
    }
    if (isCameraDeniedOrPrompted && isMicrophoneDeniedOrPrompted) {
      return t('preJoin.permissions.allowCameraAndMic');
    }
    if (isMicrophoneDeniedOrPrompted) {
      return t('preJoin.permissions.allowMic');
    }
    if (isCameraDeniedOrPrompted) {
      return t('preJoin.permissions.allowCamera');
    }
    return null;
  }, [t, isMicrophoneDeniedOrPrompted, isCameraDeniedOrPrompted]);

  const renderVideo = useMemo(() => {
    if (!videoTrack || isCameraDeniedOrPrompted) {
      return null;
    }

    return (
      <div
        className={`aspect-video h-full w-full${mirrorVideo ? 'transform-[rotateY(180deg)]' : ''}`}
      >
        <SecureVideo
          ref={videoEl}
          data-lk-facing-mode={facingMode}
          className="h-full w-full object-cover"
          playsInline
          muted
          style={{
            display: !videoEnabled || isCameraDeniedOrPrompted ? 'none' : undefined,
            opacity: videoTrack?.isMuted || !isVideoInitiated ? 0 : 1,
            transition: 'opacity 0.3s ease-in-out',
          }}
          disablePictureInPicture
          disableRemotePlayback
        />
      </div>
    );
  }, [
    videoTrack,
    facingMode,
    videoEl,
    videoEnabled,
    isCameraDeniedOrPrompted,
    isVideoInitiated,
    mirrorVideo,
  ]);

  const renderAvatar = useMemo(() => {
    if (videoTrack && !videoTrack.isMuted && !isCameraDeniedOrPrompted) return null;

    return (
      <div className="bg-background-subtle flex items-center justify-center rounded-[16px]">
        <Avatar size="xxl">
          <AvatarImage
            src={`https://api.sovlium.ru/files/users/${userId}/avatar.webp`}
            alt="user avatar"
          />
          <AvatarFallback size="xxl" loading />
        </Avatar>
      </div>
    );
  }, [videoTrack, userId, isCameraDeniedOrPrompted]);

  return (
    <div className="bg-background-subtle relative flex aspect-video h-full w-full items-center justify-center overflow-hidden rounded-[16px]">
      <div className="relative h-full w-full">
        {renderVideo}
        {renderAvatar}

        {isPermissionsBlocked && (
          <div className="bg-opacity-60 absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black p-6 text-center">
            <p className="text-lg font-normal text-white">{t('preJoin.permissions.promptTitle')}</p>
            <ol className="list-inside list-decimal space-y-2 text-left text-sm text-white">
              {permissionsInstructions.map((instruction, index) => (
                <li key={index} className="flex items-start gap-2">
                  {index === 0 && !isSafari() && <Settings className="mt-0.5 h-4 w-4 shrink-0" />}
                  <span>{instruction}</span>
                </li>
              ))}
            </ol>
            <p className="text-text-disabled text-sm">
              {t('preJoin.permissions.canDisableAnytime')}
            </p>
            {permissionsButtonLabel && (
              <Button size="m" variant="primary" onClick={openPermissionsDialog}>
                {permissionsButtonLabel}
              </Button>
            )}
          </div>
        )}

        {!isPermissionsBlocked && hintMessage && (
          <div className="bg-opacity-60 absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black p-6 text-center">
            <p className="text-lg font-normal text-white">{hintMessage}</p>
          </div>
        )}
      </div>

      <div className="absolute bottom-5 left-5">
        <Controls audioTrack={audioTrack} videoTrack={videoTrack} />
      </div>
    </div>
  );
};

interface UserTileProps {
  audioTrack?: LocalAudioTrack;
  videoTrack?: LocalVideoTrack;
}

export const UserTile = ({ audioTrack, videoTrack }: UserTileProps) => {
  const { auth } = useCalls();
  const { data: user } = auth.useCurrentUser();
  const { userId } = user ?? {};

  const {
    userChoices: { videoEnabled, mirrorVideo = true },
  } = usePersistentUserChoices();

  const videoEl = useRef<HTMLVideoElement>(null);
  const [isVideoInitiated, setIsVideoInitiated] = useState(false);

  const isCameraDeniedOrPrompted = useCannotUseDevice('videoinput');
  const isMicrophoneDeniedOrPrompted = useCannotUseDevice('audioinput');

  const facingMode = useMemo(() => {
    if (videoTrack) {
      const { facingMode } = facingModeFromLocalTrack(videoTrack);
      return facingMode;
    }
    return 'undefined';
  }, [videoTrack]);

  useEffect(() => {
    if (!videoEnabled) {
      setIsVideoInitiated(false);
    }
  }, [videoEnabled]);

  useEffect(() => {
    if (videoTrack) {
      const handleTrackMuted = () => {
        setIsVideoInitiated(false);
      };

      const handleTrackUnmuted = () => {
        if (videoEnabled) {
          setIsVideoInitiated(true);
        }
      };

      videoTrack.on('muted', handleTrackMuted);
      videoTrack.on('unmuted', handleTrackUnmuted);

      return () => {
        videoTrack.off('muted', handleTrackMuted);
        videoTrack.off('unmuted', handleTrackUnmuted);
      };
    }
  }, [videoTrack, videoEnabled]);

  useEffect(() => {
    const currentVideoEl = videoEl.current;
    const currentVideoTrack = videoTrack;

    const handleVideoLoaded = () => {
      if (currentVideoEl && videoEnabled) {
        setIsVideoInitiated(true);
        currentVideoEl.style.opacity = '1';
      } else if (currentVideoEl) {
        currentVideoEl.style.opacity = '0';
      }
    };

    const handleVideoError = () => {
      setIsVideoInitiated(false);
    };

    if (currentVideoEl && currentVideoTrack && videoEnabled) {
      currentVideoTrack.attach(currentVideoEl);
      currentVideoEl.addEventListener('loadedmetadata', handleVideoLoaded);
      currentVideoEl.addEventListener('error', handleVideoError);
    }

    return () => {
      if (currentVideoTrack) {
        currentVideoTrack.detach();
      }
      if (currentVideoEl) {
        currentVideoEl.removeEventListener('loadedmetadata', handleVideoLoaded);
        currentVideoEl.removeEventListener('error', handleVideoError);
        currentVideoEl.style.opacity = '0';
      }
    };
  }, [videoTrack, videoEnabled]);

  return (
    <UserTileUI
      audioTrack={audioTrack}
      videoTrack={videoTrack}
      videoEnabled={videoEnabled}
      facingMode={facingMode}
      videoEl={videoEl}
      userId={userId || 'unknown'}
      isCameraDeniedOrPrompted={isCameraDeniedOrPrompted}
      isMicrophoneDeniedOrPrompted={isMicrophoneDeniedOrPrompted}
      isVideoInitiated={isVideoInitiated}
      mirrorVideo={mirrorVideo}
    />
  );
};
