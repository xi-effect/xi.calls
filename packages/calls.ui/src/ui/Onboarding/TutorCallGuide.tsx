import { useEffect, useState } from 'react';
import { driver, type Driver } from 'driver.js';
import { useTranslation } from 'react-i18next';
import { useCallStore } from '@xipkg/calls-store';
import 'driver.js/dist/driver.css';
import '../../styles/driver.css';
import {
  animateGuideClick,
  cancelGuideClick,
  clearTutorCall,
  completeTutorCall,
  followTutorCallClick,
  placeBoardPickFocus,
  readTutorCallSession,
  removeBoardPickFocus,
  waitForVisible,
  writeTutorCallPhase,
  type TutorCallPhase,
} from './tutorCallSession';

export type TutorCallGuideSurface = 'prejoin' | 'conference' | 'compact';

const PHASES: Record<TutorCallGuideSurface, TutorCallPhase[]> = {
  prejoin: ['prejoin-devices', 'prejoin-join'],
  conference: ['conference-board', 'board-modal', 'board-pick'],
  compact: ['compact-end'],
};

const STEP_NUMBER: Record<TutorCallPhase, number> = {
  'prejoin-devices': 2,
  'prejoin-join': 3,
  'conference-board': 4,
  'board-modal': 5,
  'board-pick': 6,
  'compact-end': 7,
  'board-hint': 7,
};

const SELECTOR: Record<Exclude<TutorCallPhase, 'board-hint'>, string> = {
  'prejoin-devices': '#tutor-call-preview',
  'prejoin-join': '#tutor-call-join',
  'conference-board': '#calls-onboarding-whiteboard-button',
  'board-modal': '#tutor-call-boards',
  'board-pick': '#tutor-call-demo-board',
  'compact-end': '#tutor-call-compact-actions',
};

/**
 * Продолжение шага звонка из гайда xi.tutor.
 * Сессия общая: sovlium.firstSteps.tour, step === "call".
 */
export const TutorCallGuide = ({ surface }: { surface: TutorCallGuideSurface }) => {
  const { t } = useTranslation('calls');
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const bump = () => setTick((value) => value + 1);
    window.addEventListener('first-steps-tour', bump);
    return () => window.removeEventListener('first-steps-tour', bump);
  }, []);

  useEffect(() => {
    document.addEventListener('click', followTutorCallClick, true);
    return () => document.removeEventListener('click', followTutorCallClick, true);
  }, []);

  useEffect(() => {
    const session = readTutorCallSession();
    if (!session) return;
    const phase = session.callPhase ?? (surface === 'prejoin' ? 'prejoin-devices' : undefined);
    const callStarted = Boolean(useCallStore.getState().isStarted);
    // Свой клик уже открыл конференцию, а шаг ещё про экран перед входом.
    if (
      surface === 'conference' &&
      (!phase || phase === 'prejoin-devices' || phase === 'prejoin-join')
    ) {
      writeTutorCallPhase('conference-board');
      return;
    }
    // Звонок уже закрыт, а шаг остался внутри конференции или на доске.
    if (
      surface === 'prejoin' &&
      !callStarted &&
      phase &&
      phase !== 'prejoin-devices' &&
      phase !== 'prejoin-join' &&
      phase !== 'board-hint'
    ) {
      writeTutorCallPhase('prejoin-devices');
      return;
    }
    if (surface === 'prejoin' && callStarted) return;
    if (!phase || !PHASES[surface].includes(phase) || phase === 'board-hint') return;

    let cancelled = false;
    let tour: Driver | null = null;
    let reason: 'close' | 'move' = 'close';
    const selector = SELECTOR[phase];

    const delay = phase === 'conference-board' ? 900 : 0;

    const timer = window.setTimeout(() => {
      void waitForVisible(selector).then((element) => {
        if (cancelled || !element) return;
        const stepPhase = phase;
        const highlight = stepPhase === 'board-pick' ? (placeBoardPickFocus() ?? element) : element;

        tour = driver({
          popoverClass: 'my-custom-popover-class',
          showProgress: true,
          steps: [
            {
              element: highlight,
              popover: {
                title: t(`tutorGuide.${stepPhase}.title`),
                description: t(`tutorGuide.${stepPhase}.body`),
                side: stepPhase === 'compact-end' ? 'top' : 'bottom',
                align: 'start',
                onNextClick: () => {
                  void runStep();
                },
                onDoneClick: () => {
                  void runStep();
                },
              },
            },
          ],
          showButtons: ['next', 'close'],
          nextBtnText: t('onboarding.next'),
          prevBtnText: t('onboarding.prev'),
          doneBtnText: t('onboarding.next'),
          progressText: t('onboarding.progress', {
            current: String(STEP_NUMBER[stepPhase]),
            total: '7',
          }),
          onDestroyed: () => {
            if (reason === 'close') clearTutorCall();
          },
        });

        const runStep = async () => {
          reason = 'move';
          if (stepPhase === 'prejoin-devices') writeTutorCallPhase('prejoin-join');
          if (stepPhase === 'prejoin-join') {
            const button = document.querySelector<HTMLButtonElement>('#tutor-call-join');
            if (button && (await animateGuideClick(button))) button.click();
            writeTutorCallPhase('conference-board');
          }
          if (stepPhase === 'conference-board') {
            const button = document.querySelector<HTMLButtonElement>(
              '#calls-onboarding-whiteboard-button',
            );
            if (button && (await animateGuideClick(button))) button.click();
            writeTutorCallPhase('board-modal');
          }
          if (stepPhase === 'board-modal') writeTutorCallPhase('board-pick');
          if (stepPhase === 'board-pick') {
            if (await animateGuideClick(element)) element.click();
            await new Promise((resolve) => window.setTimeout(resolve, 400));
            const confirm = document.querySelector<HTMLButtonElement>('#tutor-call-boards-confirm');
            // Фазу пишем до клика, чтобы закрытие модалки не вернуло шаг назад,
            // но без события: оно оборвало бы анимацию нажатия на «Выбрать».
            writeTutorCallPhase('compact-end', false);
            if (confirm && !confirm.disabled && (await animateGuideClick(confirm, element))) {
              confirm.click();
            }
            window.dispatchEvent(new Event('first-steps-tour'));
          }
          if (stepPhase === 'compact-end') {
            const end = document.querySelector<HTMLButtonElement>('#tutor-call-end');
            if (end && (await animateGuideClick(end))) end.click();
            completeTutorCall();
          }
          tour?.destroy();
        };

        tour.drive();
      });
    }, delay);

    return () => {
      cancelled = true;
      cancelGuideClick();
      removeBoardPickFocus();
      window.clearTimeout(timer);
      reason = 'move';
      tour?.destroy();
    };
  }, [surface, t, tick]);

  return null;
};
