import { LocalAudioTrack, LocalVideoTrack, Track } from 'livekit-client';
import { useCallback, useState } from 'react';
import { TrackToggle } from '../TrackToggle';

// Мик и камера показывают DeviceHoverMenu по долгому тапу/hover, но это два
// независимых компонента, ничего не знающих друг о друге — на тачскринах
// (нет hover, нет native outside-click, закрывающего оба сразу) открытие
// одного не закрывает другой. DevicesBar — общий владелец обоих TrackToggle,
// поэтому именно здесь и держим взаимоисключающий стейт "какое меню открыто".
type DeviceMenuType = 'audio' | 'video';

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
  const [openDeviceMenu, setOpenDeviceMenu] = useState<DeviceMenuType | null>(null);

  // Стабильные ссылки, а не инлайн-стрелки в JSX: DeviceHoverMenu держит
  // selectDeviceHandler/deviceItems в useMemo/useCallback именно ради того,
  // чтобы не пересчитывать список при каждом чужом ре-рендере — нестабильный
  // onOpenChange свёл бы эту мемоизацию на нет.
  const handleAudioOpenChange = useCallback((open: boolean) => {
    setOpenDeviceMenu((prev) => (open ? 'audio' : prev === 'audio' ? null : prev));
  }, []);

  const handleVideoOpenChange = useCallback((open: boolean) => {
    setOpenDeviceMenu((prev) => (open ? 'video' : prev === 'video' ? null : prev));
  }, []);

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
          open={openDeviceMenu === 'audio'}
          onOpenChange={handleAudioOpenChange}
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
          open={openDeviceMenu === 'video'}
          onOpenChange={handleVideoOpenChange}
        />
      )}
    </>
  );
};
