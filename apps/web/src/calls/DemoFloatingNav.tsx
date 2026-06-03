import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { Link } from '@tanstack/react-router';

const DEMO_LINK_CLASS =
  'text-brand-80 hover:text-brand-100 rounded-lg px-2 py-1 text-xs transition-colors hover:bg-gray-5';

const DEMO_LINK_ACTIVE_CLASS = 'bg-gray-5 text-brand-100 font-medium';

const STORAGE_KEY = 'xi-calls-demo-nav-position';
const VIEWPORT_MARGIN = 12;

type PositionT = { x: number; y: number };

const clampPosition = (pos: PositionT, width: number, height: number): PositionT => ({
  x: Math.min(
    Math.max(VIEWPORT_MARGIN, pos.x),
    Math.max(VIEWPORT_MARGIN, window.innerWidth - width - VIEWPORT_MARGIN),
  ),
  y: Math.min(
    Math.max(VIEWPORT_MARGIN, pos.y),
    Math.max(VIEWPORT_MARGIN, window.innerHeight - height - VIEWPORT_MARGIN),
  ),
});

const readStoredPosition = (): PositionT | null => {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PositionT;
    if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
      return parsed;
    }
  } catch {
    /* ignore */
  }
  return null;
};

/** Плавающее меню навигации между сценариями демо (вне основной вёрстки страниц) */
export const DemoFloatingNav = () => {
  const panelRef = useRef<HTMLDivElement>(null);
  const positionRef = useRef<PositionT | null>(null);
  const dragRef = useRef<{ pointerId: number; offsetX: number; offsetY: number } | null>(null);
  const [position, setPosition] = useState<PositionT | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  positionRef.current = position;

  const syncPosition = useCallback((next: PositionT) => {
    const panel = panelRef.current;
    if (!panel) return;
    const { width, height } = panel.getBoundingClientRect();
    const clamped = clampPosition(next, width, height);
    setPosition(clamped);
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(clamped));
  }, []);

  useLayoutEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;

    const { width } = panel.getBoundingClientRect();
    const stored = readStoredPosition();
    const defaultPos: PositionT = {
      x: window.innerWidth - width - VIEWPORT_MARGIN,
      y: VIEWPORT_MARGIN,
    };
    syncPosition(stored ?? defaultPos);
  }, [syncPosition]);

  useLayoutEffect(() => {
    const onResize = () => {
      const current = positionRef.current;
      if (!current) return;
      syncPosition(current);
    };

    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [syncPosition]);

  const onDragHandlePointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || positionRef.current === null) return;

    event.preventDefault();
    const current = positionRef.current;
    dragRef.current = {
      pointerId: event.pointerId,
      offsetX: event.clientX - current.x,
      offsetY: event.clientY - current.y,
    };
    setIsDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  }, []);

  const onDragHandlePointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    const panel = panelRef.current;
    if (!drag || drag.pointerId !== event.pointerId || !panel) return;

    const { width, height } = panel.getBoundingClientRect();
    setPosition(
      clampPosition(
        {
          x: event.clientX - drag.offsetX,
          y: event.clientY - drag.offsetY,
        },
        width,
        height,
      ),
    );
  }, []);

  const endDrag = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    dragRef.current = null;
    setIsDragging(false);

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    const current = positionRef.current;
    if (current) {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(current));
    }
  }, []);

  return (
    <div
      ref={panelRef}
      className={`fixed z-[1990] flex max-w-[min(100vw-1.5rem,16rem)] flex-col items-end transition-opacity ${
        position === null ? 'pointer-events-none opacity-0' : 'opacity-100'
      } ${isDragging ? 'select-none' : ''}`}
      style={
        position === null
          ? { top: VIEWPORT_MARGIN, right: VIEWPORT_MARGIN }
          : { left: position.x, top: position.y }
      }
      aria-label="Навигация демо"
    >
      <div className="border-gray-10 bg-gray-0/95 flex w-full flex-col gap-2 rounded-2xl border px-3 py-2.5 shadow-lg backdrop-blur-sm">
        <div
          role="button"
          tabIndex={0}
          aria-label="Перетащить меню"
          onPointerDown={onDragHandlePointerDown}
          onPointerMove={onDragHandlePointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          className={`hover:text-gray-80 -mx-1 flex cursor-grab items-center gap-1.5 rounded-lg px-1 py-0.5 text-xs font-semibold text-gray-100 transition-colors active:cursor-grabbing ${
            isDragging ? 'cursor-grabbing' : ''
          }`}
        >
          <span
            className="text-gray-40 shrink-0 text-[10px] leading-none tracking-widest"
            aria-hidden
          >
            ⋮⋮
          </span>
          <span className="min-w-0 flex-1">xi.calls — demo</span>
        </div>
        <nav className="flex flex-col gap-0.5">
          <Link
            to="/call/$callId"
            params={{ callId: 'demo' }}
            search={{ call: 'demo' }}
            className={DEMO_LINK_CLASS}
            activeProps={{ className: `${DEMO_LINK_CLASS} ${DEMO_LINK_ACTIVE_CLASS}` }}
          >
            Полная ВКС
          </Link>
          <Link
            to="/classrooms/$classroomId"
            params={{ classroomId: 'demo' }}
            search={{ tab: 'overview', call: 'demo' }}
            className={DEMO_LINK_CLASS}
            activeProps={{ className: `${DEMO_LINK_CLASS} ${DEMO_LINK_ACTIVE_CLASS}` }}
          >
            Кабинет + compact
          </Link>
          <Link
            to="/classrooms/$classroomId/boards/$boardId"
            params={{ classroomId: 'demo', boardId: '1' }}
            search={{ call: 'demo' }}
            className={DEMO_LINK_CLASS}
            activeProps={{ className: `${DEMO_LINK_CLASS} ${DEMO_LINK_ACTIVE_CLASS}` }}
          >
            Доска + compact
          </Link>
        </nav>
      </div>
    </div>
  );
};
