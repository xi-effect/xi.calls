import React from 'react';
import { Select, SelectContent, SelectGroup, SelectTrigger, SelectValue } from '@xipkg/select';
import { Conference, Microphone, SoundTwo } from '@xipkg/icons';
import { useMediaDeviceSelect } from '@livekit/components-react';
import { excludeOsDefaultDevices } from '@xipkg/calls-utils';
import { useTranslation } from 'react-i18next';
import { MediaDeviceKind, MediaDeviceSelect } from './MediaDeviceSelect';

export interface MediaDeviceMenuProps {
  disabled?: boolean;
  kind: MediaDeviceKind;
  initialSelection: string | undefined;
  onDeviceSelected?: (kind: MediaDeviceKind, deviceId: string) => void;
  warnDisable?: boolean;
  requestPermissions?: boolean;
}

export const MediaDeviceMenu = ({
  warnDisable,
  kind,
  initialSelection,
  onDeviceSelected,
  disabled,
  requestPermissions = false,
}: MediaDeviceMenuProps) => {
  const { t } = useTranslation('calls');

  const placeholders = {
    audioinput: t('preJoin.device.builtinMic'),
    audiooutput: t('preJoin.device.builtinSpeakers'),
    videoinput: t('preJoin.device.builtinCamera'),
    default: t('preJoin.device.default'),
  };

  const handleError = React.useCallback((e: Error) => {
    console.error('Media device error:', e);
  }, []);
  const { devices: rawDevices, setActiveMediaDevice } = useMediaDeviceSelect({
    kind,
    room: undefined, // Для PreJoin не нужна комната
    requestPermissions,
    onError: handleError,
  });
  const devices = React.useMemo(() => excludeOsDefaultDevices(rawDevices), [rawDevices]);

  // 'default' — реальный сентинел ("используется устройство ОС"), для него
  // и только для него уместна подпись "По умолчанию". Во всех остальных
  // случаях — нет выбора вовсе (undefined/'') или сохранён конкретный
  // deviceId, которого сейчас нет среди устройств (отключили/сменили) —
  // показываем подпись по типу устройства, а не вводящее в заблуждение "default".
  const getPlaceholder = () => {
    if (initialSelection === 'default') return placeholders.default;
    return placeholders[kind] || placeholders.default;
  };

  const handleActiveChange = async (deviceId: string) => {
    onDeviceSelected?.(kind, deviceId);
    await setActiveMediaDevice(deviceId);
  };

  // Radix Select показывает placeholder только для пустого value — если
  // initialSelection не найден среди devices (например 'default', которого
  // здесь уже нет), нужно явно передать undefined, а не значение как есть.
  const hasInitialSelection = devices.some((device) => device.deviceId === initialSelection);

  return (
    <div className={`${warnDisable ? 'border-tag-orange-accent rounded-lg border-2' : null}`}>
      <Select
        onValueChange={handleActiveChange}
        value={hasInitialSelection ? initialSelection : undefined}
        disabled={disabled || warnDisable || devices.length === 0 || devices[0].deviceId === ''}
      >
        <SelectTrigger
          className="text-text-primary flex w-full flex-row"
          before={
            <div>
              {kind === 'videoinput' && (
                <Conference width={14} className="fill-icon-primary shrink-0" />
              )}
              {kind === 'audiooutput' && (
                <SoundTwo width={14} className="fill-icon-primary shrink-0" />
              )}
              {!(kind === 'videoinput' || kind === 'audiooutput') && (
                <Microphone width={14} className="fill-icon-primary shrink-0" />
              )}
            </div>
          }
        >
          <SelectValue placeholder={getPlaceholder()} />
        </SelectTrigger>
        <SelectContent className="w-full" onTouchEnd={(event) => event.preventDefault()}>
          {devices.length !== 0 && devices[0].deviceId !== '' && (
            <SelectGroup>
              <MediaDeviceSelect devices={devices} />
            </SelectGroup>
          )}
        </SelectContent>
      </Select>
    </div>
  );
};
