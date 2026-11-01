import { useEffect } from 'react';

/**
 * Чат и поля ввода внутри #videoConferenceContainer.
 * Атрибуты onselectstart/oncopy на контейнере сюда не подходят: они гасят
 * событие у всех потомков и не умеют смотреть на target.
 */
const SELECTABLE_REGION_SELECTOR = [
  '[data-allow-text-selection]',
  '.select-text',
  'textarea',
  'select',
  'input:not([type="button"]):not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="submit"]):not([type="reset"]):not([type="file"]):not([type="color"]):not([type="image"])',
  '[contenteditable]:not([contenteditable="false"])',
].join(',');

const nodeElement = (node: EventTarget | Node | null): Element | null => {
  if (node instanceof Element) return node;
  if (node instanceof Node) return node.parentElement;
  return null;
};

const isInSelectableRegion = (node: EventTarget | Node | null) =>
  Boolean(nodeElement(node)?.closest(SELECTABLE_REGION_SELECTOR));

const blockUnlessTargetSelectable = (event: Event) => {
  if (isInSelectableRegion(event.target)) return;
  event.preventDefault();
  event.stopPropagation();
};

/** copy часто целится в контейнер, а не в узел с выделением. */
const blockCopyUnlessTextSelection = (event: Event) => {
  if (isInSelectableRegion(event.target)) return;

  const selection = document.getSelection();
  const anchor = selection && !selection.isCollapsed ? selection.anchorNode : null;
  if (isInSelectableRegion(anchor)) return;

  event.preventDefault();
  event.stopPropagation();
};

/**
 * Хук для глобальной блокировки браузерных элементов управления видео.
 * Применяется ко всему контейнеру ВКС, кроме текста чата и полей ввода.
 *
 * Слушатели вешаются только если контейнер уже есть на маунте Call.
 * После PreJoin его ещё нет, и эффект с пустыми deps больше не запускается —
 * выделение в чате работает. Возврат с доски монтирует Call заново уже со
 * стартовавшей комнатой: контейнер есть сразу, и без исключения selectstart
 * гасит выделение сообщений.
 */
export const useVideoSecurity = () => {
  useEffect(() => {
    const container = document.getElementById('videoConferenceContainer');
    if (!container) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.key === 'F12' ||
        (event.ctrlKey && event.shiftKey && (event.key === 'I' || event.key === 'J')) ||
        (event.ctrlKey && event.key === 'u') ||
        (event.ctrlKey && event.key === 's')
      ) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    const handlePrint = (event: Event) => {
      event.preventDefault();
      event.stopPropagation();
    };

    container.addEventListener('contextmenu', blockUnlessTargetSelectable);
    container.addEventListener('selectstart', blockUnlessTargetSelectable);
    container.addEventListener('dragstart', blockUnlessTargetSelectable);
    container.addEventListener('copy', blockCopyUnlessTextSelection);
    container.addEventListener('beforeprint', handlePrint);
    container.addEventListener('keydown', handleKeyDown);

    container.setAttribute('onbeforeprint', 'return false');

    container.style.userSelect = 'none';
    container.style.webkitUserSelect = 'none';
    // @ts-expect-error - moz префиксы не типизированы в TypeScript
    container.style.mozUserSelect = 'none';
    // @ts-expect-error - ms префиксы не типизированы в TypeScript
    container.style.msUserSelect = 'none';
    // @ts-expect-error - webkit префиксы не типизированы в TypeScript
    container.style.webkitTouchCallout = 'none';
    // @ts-expect-error - webkit префиксы не типизированы в TypeScript
    container.style.webkitUserDrag = 'none';
    // @ts-expect-error - khtml префиксы не типизированы в TypeScript
    container.style.khtmlUserSelect = 'none';

    return () => {
      container.removeEventListener('contextmenu', blockUnlessTargetSelectable);
      container.removeEventListener('selectstart', blockUnlessTargetSelectable);
      container.removeEventListener('dragstart', blockUnlessTargetSelectable);
      container.removeEventListener('copy', blockCopyUnlessTextSelection);
      container.removeEventListener('beforeprint', handlePrint);
      container.removeEventListener('keydown', handleKeyDown);
      container.removeAttribute('onbeforeprint');
      container.removeAttribute('oncontextmenu');
      container.removeAttribute('ondragstart');
      container.removeAttribute('onselectstart');
      container.removeAttribute('oncopy');
    };
  }, []);
};
