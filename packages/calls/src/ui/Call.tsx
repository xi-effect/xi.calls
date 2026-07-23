import { useEffect } from 'react';
import { useCallsNavigation } from '@xipkg/calls-providers';
import { useInitUserDevices, useVideoSecurity, useVisualViewportHeight } from '@xipkg/calls-hooks';
import { useCallStore, useFocusModeStore } from '@xipkg/calls-store';
import { PreJoin } from './PreJoin';
import { ActiveRoom } from './Room';
import '@xipkg/calls-ui/video-security.css';
import '@xipkg/calls-ui/grid.css';

export const Call = () => {
  const isStarted = useCallStore((state) => state.isStarted);
  const focusMode = useFocusModeStore((s) => s.focusMode);
  const { pathname } = useCallsNavigation();
  // Подстраховка от бага мобильного Safari: `h-full`, унаследованный от `html`/`body`
  // хост-приложения, может оказаться выше реально видимой области (адресная строка
  // «съедает» низ экрана), из-за чего BottomBar внизу колонки уезжает за пределы
  // видимого — см. useVisualViewportHeight. На платформах без этого бага (десктоп,
  // Android) значение совпадает с обычной высотой контейнера, поведение не меняется.
  //
  // Хост (xi.tutor) на мобилке рисует fixed MobileBottomBar (64px) и выставляет
  // --calls-layout-bottom-offset; без вычета этого offset BottomBar конференции
  // оказывается под navbar. В focusMode / без navbar переменная = 0px.
  const viewportHeight = useVisualViewportHeight();

  useInitUserDevices();
  useVideoSecurity();

  const mode = useCallStore((state) => state.mode);
  const activeBoardId = useCallStore((state) => state.activeBoardId);
  const activeClassroom = useCallStore((state) => state.activeClassroom);
  const updateStore = useCallStore((state) => state.updateStore);

  useEffect(() => {
    const isOnCallPage = /^\/call\/[^/]+$/.test(pathname);

    // Переход "на доску" сначала переключает mode на 'compact' (вместе с уже
    // выставленными activeBoardId/activeClassroom) и только затем инициирует
    // навигацию на страницу доски (см. BottomBar.handleBackToBoard, useModeSync).
    // Между этими двумя шагами возможен один render, где pathname ещё указывает
    // на /call/:id, а mode уже 'compact' — раньше этот эффект успевал откатить
    // mode обратно на 'full' до завершения навигации, из-за чего компактный вид
    // и подписки на треки участников дёргались туда-сюда (mount/unmount VideoGrid
    // и лавина renegotiation), что при 3+ участниках могло приводить к разрыву
    // соединения у кого-то из них. Не откатываем mode, если уже есть цель перехода
    // (activeBoardId/activeClassroom) — это признак намеренного, ещё не завершённого
    // перехода на доску, а не устаревшего состояния.
    const hasPendingBoardTransition = Boolean(activeBoardId && activeClassroom);

    if (isOnCallPage && mode === 'compact' && !hasPendingBoardTransition) {
      updateStore('mode', 'full');
    }
  }, [pathname, mode, activeBoardId, activeClassroom, updateStore]);

  return (
    <div
      className={'h-full'}
      style={
        {
          ...(viewportHeight
            ? {
                height: `calc(${viewportHeight}px - var(--calls-layout-bottom-offset, 0px))`,
              }
            : undefined),
          ...(focusMode
            ? {
                '--header-height': '0px',
                '--available-height': '100%',
              }
            : undefined),
        } as React.CSSProperties
      }
    >
      <div className="flex h-full min-h-0 w-full flex-col">
        {isStarted ? (
          <div
            id="videoConferenceContainer"
            className="bg-background-page flex h-full min-h-0 flex-col"
          >
            <ActiveRoom />
          </div>
        ) : (
          <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
            <PreJoin />
          </div>
        )}
      </div>
    </div>
  );
};
