import { Track } from 'livekit-client';
import { supportsScreenSharing } from '@livekit/components-core';
import { useRoomContext, useTrackToggle } from '@livekit/components-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@xipkg/tooltip';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { TrackToggle } from '../shared';

export const ScreenShareButton = ({ className }: { className?: string }) => {
  const { t } = useTranslation('calls');
  const browserSupportsScreenSharing = supportsScreenSharing();
  const room = useRoomContext();

  const { toggle, enabled } = useTrackToggle({
    source: Track.Source.ScreenShare,
    captureOptions: { audio: true, selfBrowserSurface: 'include' },
  });

  const closeAllScreenShareTracks = useCallback(() => {
    const pubs = room.localParticipant.getTrackPublications();

    pubs.forEach((pub) => {
      if (pub.source === Track.Source.ScreenShare || pub.source === Track.Source.ScreenShareAudio) {
        const mediaStreamTrack = pub.track?.mediaStreamTrack;
        mediaStreamTrack?.stop();
      }
    });
  }, [room.localParticipant]);

  const toggleScreenShare = useCallback(() => {
    if (enabled) {
      closeAllScreenShareTracks();
    }
    toggle();
  }, [closeAllScreenShareTracks, enabled, toggle]);

  return (
    <>
      {browserSupportsScreenSharing && (
        <Tooltip delayDuration={1000}>
          <TooltipTrigger className="bg-transparent" asChild>
            <div>
              <TrackToggle
                className={className}
                source={Track.Source.ScreenShare}
                screenShareEnabled={enabled}
                onChange={toggleScreenShare}
              />
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" align="center">
            {enabled ? t('bottomBar.stopScreenShare') : t('bottomBar.shareScreen')}
          </TooltipContent>
        </Tooltip>
      )}
    </>
  );
};
