import { LocalAudioTrack, LocalVideoTrack, Track } from 'livekit-client';
import { TrackToggle } from '../TrackToggle';

type TrackToggleType = {
  source: Track.Source;
  onChange?: (enabled: boolean, isUserInitiated: boolean) => void;
  showIcon?: boolean;
  devices?: MediaDeviceInfo[];
  activeDeviceId?: string;
  onSelectDevice?: (deviceId: string) => void;
};

type DevicesBarPropsT = {
  microTrack?: LocalAudioTrack;
  microEnabled?: boolean;
  microTrackToggle?: TrackToggleType;
  videoTrack?: LocalVideoTrack;
  videoEnabled?: boolean;
  videoTrackToggle?: TrackToggleType;
  className?: string;
};

export const DevicesBar = ({
  microTrack,
  microEnabled,
  microTrackToggle,
  videoTrack,
  videoEnabled,
  videoTrackToggle,
  className,
}: DevicesBarPropsT) => {
  // console.log('DevicesBar props:', {
  //   microTrack: !!microTrack,
  //   microEnabled,
  //   microTrackToggle: !!microTrackToggle,
  //   videoTrack: !!videoTrack,
  //   videoEnabled,
  //   videoTrackToggle: !!videoTrackToggle,
  // });

  return (
    <>
      {microTrackToggle && (
        <TrackToggle
          className={className}
          microTrack={microTrack}
          microEnabled={microEnabled}
          source={microTrackToggle.source}
          onChange={microTrackToggle.onChange}
          showIcon={microTrackToggle.showIcon}
          devices={microTrackToggle.devices}
          activeDeviceId={microTrackToggle.activeDeviceId}
          onSelectDevice={microTrackToggle.onSelectDevice}
        />
      )}
      {videoTrackToggle && (
        <TrackToggle
          className={className}
          videoTrack={videoTrack}
          videoEnabled={videoEnabled}
          source={videoTrackToggle.source}
          onChange={videoTrackToggle.onChange}
          showIcon={videoTrackToggle.showIcon}
          devices={videoTrackToggle.devices}
          activeDeviceId={videoTrackToggle.activeDeviceId}
          onSelectDevice={videoTrackToggle.onSelectDevice}
        />
      )}
    </>
  );
};
