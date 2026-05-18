import { Link } from '@tanstack/react-router';

type DemoChromePropsT = {
  title?: string;
  children: React.ReactNode;
};

/** Навигация между сценариями демо (без xi.tutor) */
export const DemoChrome = ({ title, children }: DemoChromePropsT) => {
  return (
    <div className="bg-gray-5 flex h-dvh min-h-0 flex-col">
      <header className="border-gray-10 bg-gray-0 flex shrink-0 flex-wrap items-center gap-3 border-b px-4 py-2">
        <span className="text-s-base font-semibold text-gray-100">
          {title ?? 'xi.calls — demo'}
        </span>
        <nav className="flex flex-wrap gap-2">
          <Link
            to="/call/$callId"
            params={{ callId: 'demo' }}
            search={{ call: 'demo' }}
            className="text-brand-80 hover:text-brand-100 text-xs underline"
          >
            Полная ВКС
          </Link>
          <Link
            to="/classrooms/$classroomId"
            params={{ classroomId: 'demo' }}
            search={{ tab: 'overview', call: 'demo' }}
            className="text-brand-80 hover:text-brand-100 text-xs underline"
          >
            Кабинет + compact
          </Link>
          <Link
            to="/classrooms/$classroomId/boards/$boardId"
            params={{ classroomId: 'demo', boardId: '1' }}
            search={{ call: 'demo' }}
            className="text-brand-80 hover:text-brand-100 text-xs underline"
          >
            Доска + compact
          </Link>
        </nav>
      </header>
      <main className="min-h-0 flex-1 overflow-hidden">{children}</main>
    </div>
  );
};
