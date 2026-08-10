import { useEffect, useRef, useState } from 'react';
import { TrackEvent, type LocalVideoTrack } from 'livekit-client';
import { cn } from '@xipkg/utils';
import { SecureVideo } from '../VideoTrack';
import { useTranslation } from 'react-i18next';

type CameraPreviewProps = {
  videoTrack?: LocalVideoTrack;
  mirror: boolean;
  unavailable?: boolean;
  /** Нужен в deps, чтобы переаттачить элемент после setProcessor / stopProcessor */
  blurEnabled?: boolean;
};

export const CameraPreview = ({
  videoTrack,
  mirror,
  unavailable,
  blurEnabled,
}: CameraPreviewProps) => {
  const { t } = useTranslation('calls');
  const videoEl = useRef<HTMLVideoElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const el = videoEl.current;
    const track = videoTrack;

    if (!el || !track || unavailable) {
      setReady(false);
      return;
    }

    const handleLoaded = () => setReady(true);
    const handleError = () => setReady(false);

    const attach = () => {
      track.attach(el);
      el.muted = true;
      void el.play().catch(() => {
        /* autoplay может быть заблокирован — muted play обычно проходит */
      });
    };

    attach();
    el.addEventListener('loadedmetadata', handleLoaded);
    el.addEventListener('error', handleError);

    // После BackgroundProcessor LiveKit обновляет attachedElements сам,
    // но в Strict Mode / при гонке attach↔setProcessor элемент может остаться на raw track.
    const onProcessorUpdate = () => {
      attach();
    };
    track.on(TrackEvent.TrackProcessorUpdate, onProcessorUpdate);

    return () => {
      track.off(TrackEvent.TrackProcessorUpdate, onProcessorUpdate);
      track.detach(el);
      el.removeEventListener('loadedmetadata', handleLoaded);
      el.removeEventListener('error', handleError);
      setReady(false);
    };
  }, [videoTrack, unavailable, blurEnabled]);

  return (
    <div className="bg-background-secondary relative aspect-video w-full overflow-hidden rounded-xl">
      {unavailable || !videoTrack ? (
        <div className="text-text-secondary flex h-full w-full items-center justify-center text-sm">
          {t('soundAndVideo.cameraUnavailable')}
        </div>
      ) : (
        <div className={cn('h-full w-full', mirror && 'transform-[rotateY(180deg)]')}>
          <SecureVideo
            ref={videoEl}
            className="h-full w-full object-cover"
            playsInline
            muted
            style={{ opacity: ready ? 1 : 0, transition: 'opacity 0.2s ease-in-out' }}
            disablePictureInPicture
            disableRemotePlayback
          />
        </div>
      )}
    </div>
  );
};
