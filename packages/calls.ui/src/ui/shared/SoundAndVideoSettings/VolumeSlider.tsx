import { Label } from '@xipkg/label';
import { Slider } from '@xipkg/slider';
import { Soundoff, SoundOn } from '@xipkg/icons';
import { useTranslation } from 'react-i18next';

type VolumeSliderProps = {
  value: number;
  onChange: (volume: number) => void;
  disabled?: boolean;
  /** mic — чувствительность входа; speaker — громкость выхода */
  variant?: 'microphone' | 'speaker';
};

export const VolumeSlider = ({
  value,
  onChange,
  disabled,
  variant = 'speaker',
}: VolumeSliderProps) => {
  const { t } = useTranslation('calls');
  const percent = Math.round(value * 100);

  return (
    <div className="space-y-2">
      <Label className="text-text-secondary text-sm">
        {variant === 'microphone' ? t('soundAndVideo.sensitivity') : t('soundAndVideo.volume')}
      </Label>
      <div className="flex items-center gap-3">
        <Soundoff className="fill-icon-secondary h-4 w-4 shrink-0" />
        <Slider
          value={[percent]}
          onValueChange={(values) => onChange((values[0] ?? percent) / 100)}
          min={0}
          max={100}
          step={1}
          disabled={disabled}
          className="flex-1"
        />
        <SoundOn className="fill-icon-secondary h-4 w-4 shrink-0" />
      </div>
    </div>
  );
};
