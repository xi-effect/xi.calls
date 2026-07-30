import { useMemo } from 'react';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalCloseButton,
  ModalFooter,
} from '@xipkg/modal';
import { Button } from '@xipkg/button';
import { usePermissionsStore, closePermissionsDialog } from '@xipkg/calls-store';
import { useWatchPermissions } from '@xipkg/calls-hooks';
import { isSafari, isFireFox } from '@xipkg/calls-utils';
import { Settings, Close } from '@xipkg/icons';
import { Trans, useTranslation } from 'react-i18next';

/** Ссылки на официальные инструкции по выдаче прав в браузерах */
const BROWSER_HELP_LINKS = {
  chrome: 'https://support.google.com/chrome/answer/2693767',
  edge: 'https://support.microsoft.com/windows/windows-camera-microphone-and-privacy-a83257bc-e990-d54a-d212-b5e41beba857',
  firefox: 'https://support.mozilla.org/kb/how-manage-your-camera-and-microphone-permissions',
  safari: 'https://support.apple.com/guide/safari/ibrwe2159f50/mac',
} as const;

type BrowserKey = keyof typeof BROWSER_HELP_LINKS;

/**
 * Модальное окно: объяснение прав на камеру и микрофон и инструкции по браузерам.
 * Singleton: useWatchPermissions выполняется один раз в приложении.
 */
export const PermissionsDialog = () => {
  useWatchPermissions();
  const { t, i18n } = useTranslation('calls');

  const isPermissionDialogOpen = usePermissionsStore((s) => s.isPermissionDialogOpen);

  const currentBrowser = useMemo((): BrowserKey => {
    if (isSafari()) return 'safari';
    if (isFireFox()) return 'firefox';
    return 'chrome'; // Chrome, Edge и остальные Chromium-based
  }, []);

  const instructions = useMemo(() => {
    const key = currentBrowser;
    return {
      title: t(`permissions.browsers.${key}.title`),
      steps: [
        t(`permissions.browsers.${key}.step1`),
        t(`permissions.browsers.${key}.step2`),
        t(`permissions.browsers.${key}.step3`),
      ],
      link: BROWSER_HELP_LINKS[key],
      linkLabel: t(`permissions.browsers.${key}.link`),
    };
  }, [currentBrowser, t, i18n.language]);

  if (!isPermissionDialogOpen) {
    return null;
  }

  return (
    <Modal open={isPermissionDialogOpen} onOpenChange={closePermissionsDialog}>
      <ModalContent>
        <ModalCloseButton>
          <Close className="fill-icon-primary" />
        </ModalCloseButton>
        <ModalHeader className="border-border-default border-b">
          <ModalTitle className="text-text-primary text-xl font-semibold">
            {t('permissions.title')}
          </ModalTitle>
        </ModalHeader>

        <div className="flex flex-col gap-8 p-6">
          <section className="leading-relaxed">
            <p className="text-m-base text-text-primary">
              <Trans
                i18nKey="permissions.description"
                ns="calls"
                components={{
                  camera: <strong className="text-text-primary font-semibold" />,
                  mic: <strong className="text-text-primary font-semibold" />,
                }}
              />
            </p>
          </section>

          <section>
            <h3 className="text-m-base text-text-primary mb-1 font-semibold">
              {t('permissions.howTo')}
            </h3>
            <p className="text-s-base text-text-secondary mb-4">{instructions.title}</p>
            <ol className="text-s-base text-text-primary list-decimal space-y-3 pl-5">
              {instructions.steps.map((step, index) => (
                <li key={index} className="flex items-start gap-2 pl-1">
                  {index === 0 && currentBrowser === 'chrome' && (
                    <Settings className="text-text-secondary mt-0.5 h-4 w-4 shrink-0" />
                  )}
                  <span className="leading-relaxed">{step}</span>
                </li>
              ))}
            </ol>
            <a
              href={instructions.link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-s-base text-text-link decoration-text-link/50 hover:text-text-link hover:decoration-text-link mt-4 inline-flex items-center gap-1 font-medium underline underline-offset-2 transition-colors"
            >
              {instructions.linkLabel}
              <span aria-hidden>→</span>
            </a>
          </section>

          <section className="border-border-default bg-background-page rounded-xl border p-4">
            <p className="text-s-base text-text-primary mb-2 font-semibold">
              {t('permissions.otherBrowsers')}
            </p>
            <p className="text-s-base text-text-secondary flex flex-wrap items-center gap-x-1 gap-y-1">
              <a
                href={BROWSER_HELP_LINKS.chrome}
                target="_blank"
                rel="noopener noreferrer"
                className="text-text-link decoration-text-link/50 hover:text-text-link underline underline-offset-2 transition-colors"
              >
                Chrome
              </a>
              <span className="text-text-disabled" aria-hidden>
                ·
              </span>
              <a
                href={BROWSER_HELP_LINKS.edge}
                target="_blank"
                rel="noopener noreferrer"
                className="text-text-link decoration-text-link/50 hover:text-text-link underline underline-offset-2 transition-colors"
              >
                Edge / Windows
              </a>
              <span className="text-text-disabled" aria-hidden>
                ·
              </span>
              <a
                href={BROWSER_HELP_LINKS.firefox}
                target="_blank"
                rel="noopener noreferrer"
                className="text-text-link decoration-text-link/50 hover:text-text-link underline underline-offset-2 transition-colors"
              >
                Firefox
              </a>
              <span className="text-text-disabled" aria-hidden>
                ·
              </span>
              <a
                href={BROWSER_HELP_LINKS.safari}
                target="_blank"
                rel="noopener noreferrer"
                className="text-text-link decoration-text-link/50 hover:text-text-link underline underline-offset-2 transition-colors"
              >
                Safari
              </a>
            </p>
          </section>
        </div>

        <ModalFooter className="border-border-default flex border-t">
          <Button type="button" variant="ghost" onClick={closePermissionsDialog}>
            {t('permissions.close')}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
