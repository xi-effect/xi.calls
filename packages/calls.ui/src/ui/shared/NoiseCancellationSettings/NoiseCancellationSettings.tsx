import { Label } from '@xipkg/label';
import { Toggle } from '@xipkg/toggle';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@xipkg/select';
import type { UseNoiseCancellationResult } from '@xipkg/calls-hooks';
import type { NoiseCancellationMode } from '@xipkg/calls-types';
import { NOISE_CANCELLATION_MODES } from '@xipkg/calls-types';
import { useTranslation } from 'react-i18next';

type NoiseCancellationSettingsProps = {
  nc: UseNoiseCancellationResult;
  /** Скрыть опцию «Выключено», когда тумблер вкл — только webrtc/krisp. */
  hideOffOption?: boolean;
};

export function NoiseCancellationSettings({
  nc,
  hideOffOption = false,
}: NoiseCancellationSettingsProps) {
  const { t } = useTranslation('calls');

  const modeLabels: Record<NoiseCancellationMode, string> = {
    off: t('noiseCancellation.mode.off'),
    webrtc: t('noiseCancellation.mode.webrtc'),
    krisp: t('noiseCancellation.mode.krisp'),
  };

  const options = hideOffOption
    ? (NOISE_CANCELLATION_MODES.filter(
        (m) => m !== 'off' && (m !== 'krisp' || nc.allowKrisp),
      ) as readonly ('webrtc' | 'krisp')[])
    : NOISE_CANCELLATION_MODES.filter((m) => m !== 'krisp' || nc.allowKrisp);

  const selectValue = hideOffOption
    ? nc.mode === 'off' || (nc.mode === 'krisp' && !nc.allowKrisp)
      ? 'webrtc'
      : nc.mode
    : nc.isEnabled
      ? nc.mode
      : 'off';

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-text-primary font-medium">{t('noiseCancellation.title')}</Label>
        <Toggle
          checked={nc.isEnabled}
          onCheckedChange={nc.setEnabled}
          disabled={nc.isApplying}
          data-umami-event="noise_cancellation_toggle"
          data-umami-event-state={nc.isEnabled ? 'on' : 'off'}
        />
      </div>
      <div className="space-y-1">
        <Label className="text-text-primary text-sm">{t('noiseCancellation.modeLabel')}</Label>
        <Select
          value={selectValue}
          onValueChange={(value) => nc.setMode(value as NoiseCancellationMode)}
          disabled={nc.isApplying || !nc.isEnabled}
          data-umami-event="noise_cancellation_mode_select"
        >
          <SelectTrigger className="text-text-primary w-full">
            <SelectValue placeholder={t('noiseCancellation.mode.webrtc')}>
              {modeLabels[selectValue as NoiseCancellationMode]}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {options.map((mode) => {
              const isKrispDisabled = mode === 'krisp' && !nc.allowKrisp;
              const isUnsupported = mode === 'krisp' && nc.isKrispSupported === false;
              const disabled =
                isKrispDisabled || (mode === 'krisp' && nc.isKrispSupported === false);
              return (
                <SelectItem
                  key={mode}
                  value={mode}
                  disabled={disabled}
                  className="text-text-primary h-auto"
                >
                  {modeLabels[mode]}
                  {mode === 'krisp' &&
                    (isKrispDisabled || isUnsupported) &&
                    t('noiseCancellation.unavailableSuffix')}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>
      <p className="text-text-secondary text-xs">{t('noiseCancellation.krispHint')}</p>
      {nc.lastError && (
        <p className="text-text-danger text-sm" role="alert">
          {nc.lastError}
        </p>
      )}
    </div>
  );
}
