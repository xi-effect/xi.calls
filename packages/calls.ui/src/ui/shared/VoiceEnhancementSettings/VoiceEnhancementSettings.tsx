import { useEffect, useRef } from 'react';
import { Label } from '@xipkg/label';
import { Toggle } from '@xipkg/toggle';
import { useVoiceEnhancement } from '@xipkg/calls-hooks';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

export function VoiceEnhancementSettings() {
  const { t } = useTranslation('calls');
  const voiceEnhancement = useVoiceEnhancement();
  const lastToastedError = useRef<string | null>(null);
  const isLoading = voiceEnhancement.status === 'loading';
  const isUnsupported = voiceEnhancement.status === 'unsupported';

  useEffect(() => {
    if (voiceEnhancement.status !== 'error' || !voiceEnhancement.error) {
      lastToastedError.current = null;
      return;
    }
    if (lastToastedError.current === voiceEnhancement.error) return;
    lastToastedError.current = voiceEnhancement.error;
    toast.error(t('voiceEnhancement.errorTitle'), {
      description: t('voiceEnhancement.errorDescription'),
    });
  }, [t, voiceEnhancement.error, voiceEnhancement.status]);

  return (
    <section aria-labelledby="voice-enhancement-title" className="space-y-3">
      <h3 id="voice-enhancement-title" className="text-text-primary text-sm font-semibold">
        {t('voiceEnhancement.sectionTitle')}
      </h3>
      <div className="flex items-center justify-between gap-4">
        <Label className="text-text-primary font-medium">{t('voiceEnhancement.title')}</Label>
        <Toggle
          checked={voiceEnhancement.enabled}
          onCheckedChange={(checked) => {
            if (checked) {
              voiceEnhancement.enable();
            } else {
              voiceEnhancement.disable();
            }
          }}
          disabled={isLoading || isUnsupported}
          aria-busy={isLoading}
        />
      </div>
      <p className="text-text-secondary text-xs">{t('voiceEnhancement.description')}</p>
      <p className="text-text-secondary text-xs">{t('voiceEnhancement.localProcessing')}</p>
      {isLoading && (
        <p className="text-text-secondary text-xs" role="status">
          {t('voiceEnhancement.loading')}
        </p>
      )}
      {isUnsupported && (
        <p className="text-text-secondary text-xs">{t('voiceEnhancement.unsupported')}</p>
      )}
      {voiceEnhancement.status === 'error' && (
        <p className="text-text-danger text-xs" role="alert">
          {t('voiceEnhancement.errorDescription')}
        </p>
      )}
    </section>
  );
}
