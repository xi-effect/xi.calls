import { useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { Close } from '@xipkg/icons';
import { useCallStore } from '@xipkg/calls-store';
import { ONBOARDING_IDS } from '@xipkg/calls-config';
import { driver, type DriveStep } from 'driver.js';
import { useTranslation } from 'react-i18next';
import 'driver.js/dist/driver.css';
import '../../styles/driver.css';

const ONBOARDING_STORAGE_KEY = 'calls_onboarding_completed';

export const CallsOnboarding = () => {
  const { t } = useTranslation('calls');
  const isStarted = useCallStore((state) => state.isStarted);
  const hasStartedOnboarding = useRef(false);

  useEffect(() => {
    // Проверяем, был ли уже пройден онбординг
    const onboardingCompleted = localStorage.getItem(ONBOARDING_STORAGE_KEY);
    if (onboardingCompleted === 'true') {
      return;
    }

    // Проверяем, подключен ли пользователь к конференции
    if (!isStarted || hasStartedOnboarding.current) {
      return;
    }

    const startOnboarding = () => {
      const steps: DriveStep[] = [
        {
          element: `#${ONBOARDING_IDS.WHITEBOARD_BUTTON}`,
          popover: {
            description: t('onboarding.whiteboard'),
            side: 'top' as const,
            align: 'center' as const,
          },
        },
        {
          element: `#${ONBOARDING_IDS.LINK_BUTTON}`,
          popover: {
            description: t('onboarding.link'),
            side: 'bottom' as const,
            align: 'end' as const,
          },
        },
        {
          element: `#${ONBOARDING_IDS.SETTINGS_BUTTON}`,
          popover: {
            description: t('onboarding.settings'),
            side: 'bottom' as const,
            align: 'end' as const,
          },
        },
        {
          element: `#${ONBOARDING_IDS.BACK_BUTTON}`,
          popover: {
            description: t('onboarding.back'),
            side: 'bottom' as const,
            align: 'start' as const,
          },
        },
      ].filter((step) => {
        // Фильтруем шаги, для которых элементы не найдены
        const element = document.querySelector(step.element as string);
        return element !== null;
      });

      // Проверяем наличие хотя бы одного элемента
      if (steps.length === 0) {
        console.warn('Элементы для онбординга не найдены');
        return;
      }

      const driverObj = driver({
        popoverClass: 'my-custom-popover-class',
        showProgress: true,
        steps: steps,
        onPopoverRender: (popover) => {
          const defaultCloseButton = popover.closeButton;
          const customCloseButton = document.createElement('button');
          customCloseButton.className = 'driver-popover-close-btn';

          // Создаем корень для рендеринга компонента
          const root = createRoot(customCloseButton);
          root.render(<Close size="s" className="fill-icon-secondary h-4 w-4" />);

          defaultCloseButton.replaceWith(customCloseButton);
          customCloseButton.addEventListener('click', () => {
            driverObj.destroy();
          });
        },
        nextBtnText: t('onboarding.next'),
        prevBtnText: t('onboarding.prev'),
        doneBtnText: t('onboarding.done'),
        // driver.js сам подставляет {{current}}/{{total}} — оставляем плейсхолдеры как есть
        progressText: t('onboarding.progress', {
          current: '{{current}}',
          total: '{{total}}',
        }),
        onDestroyed: () => {
          // Сохраняем флаг завершения онбординга в localStorage
          localStorage.setItem(ONBOARDING_STORAGE_KEY, 'true');
        },
      });

      driverObj.drive();
      hasStartedOnboarding.current = true;
    };

    let onboardingTimeoutId: ReturnType<typeof setTimeout> | null = null;

    // Проверяем наличие элементов перед запуском онбординга
    const checkElements = () => {
      const settingsButton = document.querySelector(`#${ONBOARDING_IDS.SETTINGS_BUTTON}`);

      // Минимально нужна кнопка Settings (она есть у всех)
      if (settingsButton) {
        // Добавляем задержку в 2 секунды перед запуском онбординга
        onboardingTimeoutId = setTimeout(() => {
          startOnboarding();
        }, 2000);
        return true;
      }
      return false;
    };

    // Сначала пытаемся сразу запустить
    let checkTimeoutId: ReturnType<typeof setTimeout> | null = null;
    if (!checkElements()) {
      // Если элементы еще не отрендерились, ждем немного
      checkTimeoutId = setTimeout(() => {
        checkElements();
      }, 500);
    }

    return () => {
      if (checkTimeoutId) {
        clearTimeout(checkTimeoutId);
      }
      if (onboardingTimeoutId) {
        clearTimeout(onboardingTimeoutId);
      }
    };
  }, [isStarted, t]);

  return null;
};
