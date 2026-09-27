import { useMemo, type ReactNode } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@xipkg/select';
import { useMediaDeviceSelect } from '@livekit/components-react';
import { excludeOsDefaultDevices } from '@xipkg/calls-utils';
import { useTranslation } from 'react-i18next';

type DeviceKind = 'videoinput' | 'audioinput' | 'audiooutput';

type DeviceSelectProps = {
  kind: DeviceKind;
  currentDeviceId?: string;
  onDeviceChange: (deviceId: string) => void;
  icon: ReactNode;
  disabled?: boolean;
  requestPermissions?: boolean;
};

export const DeviceSelect = ({
  kind,
  currentDeviceId,
  onDeviceChange,
  icon,
  disabled,
  requestPermissions = true,
}: DeviceSelectProps) => {
  const { t } = useTranslation('calls');
  const { devices: rawDevices } = useMediaDeviceSelect({
    kind,
    room: undefined,
    requestPermissions,
  });
  const devices = useMemo(() => excludeOsDefaultDevices(rawDevices), [rawDevices]);

  const placeholders: Record<DeviceKind, string> = {
    audioinput: t('settings.device.builtinMic'),
    audiooutput: t('settings.device.builtinSpeakers'),
    videoinput: t('settings.device.builtinCamera'),
  };

  const currentDevice = devices.find((device) => device.deviceId === currentDeviceId);
  const displayValue = currentDevice?.label || placeholders[kind];
  const hasDevices = devices.length > 0 && devices[0].deviceId !== '';

  return (
    <Select
      onValueChange={onDeviceChange}
      value={currentDeviceId || undefined}
      disabled={disabled || !hasDevices}
    >
      <SelectTrigger className="text-text-primary w-full" before={icon} size="s">
        <SelectValue placeholder={placeholders[kind]}>{displayValue}</SelectValue>
      </SelectTrigger>
      <SelectContent className="w-full">
        {devices.map((device) => (
          <SelectItem
            key={device.deviceId}
            className="text-text-primary h-auto"
            value={device.deviceId}
          >
            {device.label || t('settings.device.unnamed', { shortId: device.deviceId.slice(0, 8) })}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
