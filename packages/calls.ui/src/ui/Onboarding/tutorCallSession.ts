const STORAGE_KEY = 'sovlium.firstSteps.tour';

export type TutorCallPhase =
  | 'prejoin-devices'
  | 'prejoin-join'
  | 'conference-board'
  | 'board-modal'
  | 'board-pick'
  | 'compact-end'
  | 'board-hint';

export type TutorCallSession = {
  step: string;
  boardId?: string | null;
  callPhase?: TutorCallPhase;
};

export const readTutorCallSession = (): TutorCallSession | null => {
  if (typeof sessionStorage === 'undefined') return null;
  try {
    const parsed = JSON.parse(
      sessionStorage.getItem(STORAGE_KEY) ?? 'null',
    ) as TutorCallSession | null;
    if (!parsed || parsed.step !== 'call') return null;
    return parsed;
  } catch {
    return null;
  }
};

export const writeTutorCallPhase = (phase: TutorCallPhase, notify = true): void => {
  if (typeof sessionStorage === 'undefined') return;
  const session = readTutorCallSession();
  if (!session || session.callPhase === phase) return;
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ ...session, callPhase: phase }));
  if (notify) window.dispatchEvent(new Event('first-steps-tour'));
};

const PREJOIN_PHASES = new Set<TutorCallPhase>(['prejoin-devices', 'prejoin-join']);

export const noteTutorCallReturnedToConference = (): void => {
  if (readTutorCallSession()?.callPhase === 'compact-end') {
    writeTutorCallPhase('conference-board');
  }
};

/**
 * Пользователь нажал цель шага сам, а не через «Продолжить».
 * Программный клик анимации не считается: у него isTrusted === false.
 */
export const followTutorCallClick = (event: MouseEvent): void => {
  if (!event.isTrusted) return;
  const target = event.target;
  if (!(target instanceof Element)) return;
  const session = readTutorCallSession();
  if (!session || session.callPhase === 'board-hint') return;
  const phase = session.callPhase ?? 'prejoin-devices';

  if (target.closest('#tutor-call-join') && PREJOIN_PHASES.has(phase)) {
    writeTutorCallPhase('conference-board');
    return;
  }
  if (
    target.closest('#calls-onboarding-whiteboard-button') &&
    (phase === 'conference-board' || PREJOIN_PHASES.has(phase))
  ) {
    writeTutorCallPhase('board-modal');
    return;
  }
  if (target.closest('[data-tutor-board-id]') && phase === 'board-modal') {
    writeTutorCallPhase('board-pick');
    return;
  }
  if (
    target.closest('#tutor-call-boards-confirm') &&
    (phase === 'board-modal' || phase === 'board-pick')
  ) {
    writeTutorCallPhase('compact-end');
    return;
  }
  if (
    phase === 'compact-end' &&
    target.closest('#tutor-call-return, #tutor-call-return-only-me, #tutor-call-return-everyone')
  ) {
    writeTutorCallPhase('conference-board');
    return;
  }
  if (target.closest('#tutor-call-end') && phase === 'compact-end') {
    completeTutorCall();
  }
};

export const completeTutorCall = (): void => {
  writeTutorCallPhase('board-hint');
  window.dispatchEvent(new Event('first-steps-call-completed'));
};

/** Старт гайда звонка так же, как после шага в кабинете xi.tutor: сразу с экрана перед входом. */
export const startTutorCallGuide = (boardId = '1', classroomId = 'demo'): void => {
  if (typeof sessionStorage === 'undefined') return;
  sessionStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      step: 'call',
      role: 'tutor',
      userId: 0,
      classroomId,
      boardId,
      noteId: null,
      index: 0,
      callPhase: 'prejoin-devices',
    }),
  );
  window.dispatchEvent(new Event('first-steps-tour'));
};

export const clearTutorCall = (): void => {
  if (typeof sessionStorage === 'undefined') return;
  sessionStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new Event('first-steps-tour'));
};

export const waitForVisible = (selector: string, timeoutMs = 8000): Promise<HTMLElement | null> =>
  new Promise((resolve) => {
    const started = Date.now();
    const tick = () => {
      const node = document.querySelector(selector);
      const rect = node?.getBoundingClientRect();
      if (node instanceof HTMLElement && rect && rect.width > 0 && rect.height > 0) {
        resolve(node);
        return;
      }
      if (Date.now() - started > timeoutMs) {
        resolve(null);
        return;
      }
      window.setTimeout(tick, 200);
    };
    tick();
  });

const CURSOR_MOVE_MS = 460;
const CURSOR_PRESS_MS = 180;
const CURSOR_EASE = 'transform 460ms cubic-bezier(0.22, 1, 0.36, 1)';
const CURSOR_SVG = `<svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true"><path d="M5 3.2 L5.4 21.2 L10.2 16.6 L14.3 24.2 L17.2 22.8 L13.1 15.2 L19.4 14.6 Z" fill="#fff" stroke="#161616" stroke-width="1.6" stroke-linejoin="round"/></svg>`;

let guideClickTicket = 0;

const removeGuideCursor = () => {
  document
    .querySelectorAll('.first-steps-tour-cursor, .first-steps-tour-click')
    .forEach((node) => node.remove());
};

/** Сбрасывает курсор, если подсказка закрылась до конца анимации. */
export const cancelGuideClick = (): void => {
  guideClickTicket += 1;
  removeGuideCursor();
};

const BOARD_PICK_FOCUS_ID = 'tutor-call-board-pick-focus';

/** Прямоугольник на выбранную доску и кнопку «Выбрать», чтобы оба шага были в одной подсветке. */
export const placeBoardPickFocus = (): HTMLElement | null => {
  const board = document.querySelector('#tutor-call-demo-board');
  const confirm = document.querySelector('#tutor-call-boards-confirm');
  if (!(board instanceof HTMLElement) || !(confirm instanceof HTMLElement)) return null;
  const boardRect = board.getBoundingClientRect();
  const confirmRect = confirm.getBoundingClientRect();
  if (boardRect.width === 0 || confirmRect.width === 0) return null;
  const pad = 10;
  const left = Math.min(boardRect.left, confirmRect.left) - pad;
  const top = Math.min(boardRect.top, confirmRect.top) - pad;
  const right = Math.max(boardRect.right, confirmRect.right) + pad;
  const bottom = Math.max(boardRect.bottom, confirmRect.bottom) + pad;

  let box = document.getElementById(BOARD_PICK_FOCUS_ID);
  if (!box) {
    box = document.createElement('div');
    box.id = BOARD_PICK_FOCUS_ID;
    box.setAttribute('aria-hidden', 'true');
    document.body.appendChild(box);
  }
  box.style.position = 'fixed';
  box.style.left = `${left}px`;
  box.style.top = `${top}px`;
  box.style.width = `${right - left}px`;
  box.style.height = `${bottom - top}px`;
  box.style.pointerEvents = 'none';
  return box;
};

export const removeBoardPickFocus = (): void => {
  document.getElementById(BOARD_PICK_FOCUS_ID)?.remove();
};

/**
 * Курсор едет к цели и нажимает.
 * `from` — откуда начать: по умолчанию от кнопки подсказки, иначе от уже показанного элемента.
 */
export const animateGuideClick = (target: HTMLElement, from?: HTMLElement): Promise<boolean> => {
  const ticket = ++guideClickTicket;
  const alive = () => ticket === guideClickTicket;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const rect = target.getBoundingClientRect();
  if (reduced || rect.width === 0 || rect.height === 0) return Promise.resolve(alive());

  removeGuideCursor();
  const cursor = document.createElement('div');
  cursor.className = 'first-steps-tour-cursor';
  cursor.setAttribute('aria-hidden', 'true');
  cursor.innerHTML = CURSOR_SVG;

  const origin = (
    from ?? document.querySelector('.driver-popover-next-btn')
  )?.getBoundingClientRect();
  const tipX = 5;
  const tipY = 3;
  const startX = (origin ? origin.left + origin.width / 2 : window.innerWidth - 120) - tipX;
  const startY = (origin ? origin.top + origin.height / 2 : window.innerHeight - 80) - tipY;
  const endX = rect.left + rect.width / 2 - tipX;
  const endY = rect.top + rect.height / 2 - tipY;
  cursor.style.transition = 'none';
  cursor.style.transform = `translate3d(${startX}px, ${startY}px, 0)`;
  document.body.appendChild(cursor);
  cursor.getBoundingClientRect();

  return new Promise((resolve) => {
    const pressCursor = () => {
      if (!alive()) {
        cursor.remove();
        resolve(false);
        return;
      }
      cursor.classList.add('is-pressing');
      const ripple = document.createElement('span');
      ripple.className = 'first-steps-tour-click';
      ripple.style.left = `${rect.left + rect.width / 2}px`;
      ripple.style.top = `${rect.top + rect.height / 2}px`;
      document.body.appendChild(ripple);
      window.setTimeout(() => {
        ripple.remove();
        if (cursor.isConnected) cursor.remove();
        resolve(alive());
      }, CURSOR_PRESS_MS);
    };

    let armed = false;
    const onMoveEnd = (event: TransitionEvent) => {
      if (!armed || event.propertyName !== 'transform') return;
      cursor.removeEventListener('transitionend', onMoveEnd);
      window.clearTimeout(fallback);
      pressCursor();
    };
    cursor.addEventListener('transitionend', onMoveEnd);
    const fallback = window.setTimeout(() => {
      cursor.removeEventListener('transitionend', onMoveEnd);
      pressCursor();
    }, CURSOR_MOVE_MS + 240);

    requestAnimationFrame(() => {
      if (!alive()) {
        cursor.remove();
        resolve(false);
        return;
      }
      cursor.style.transition = CURSOR_EASE;
      requestAnimationFrame(() => {
        if (!alive()) {
          cursor.remove();
          resolve(false);
          return;
        }
        armed = true;
        cursor.style.transform = `translate3d(${endX}px, ${endY}px, 0)`;
      });
    });
  });
};
