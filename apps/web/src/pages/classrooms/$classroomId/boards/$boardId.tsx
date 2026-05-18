import { createFileRoute } from '@tanstack/react-router';
import { CompactView } from 'calls.compactview';
import { CallsDemoShell } from '../../../../calls/CallsDemoShell';
import { DemoChrome } from '../../../../calls/DemoChrome';

export const Route = createFileRoute('/classrooms/$classroomId/boards/$boardId')({
  component: BoardInClassroomPage,
});

function BoardInClassroomPage() {
  const { boardId, classroomId } = Route.useParams();

  return (
    <CallsDemoShell>
      <DemoChrome title="Доска в кабинете (compact)">
        <CompactView>
          <div className="bg-gray-10 flex h-full flex-col">
            <div className="border-gray-10 bg-gray-0 border-b px-6 py-4">
              <h1 className="text-xl-base font-semibold text-gray-100">Демо-доска #{boardId}</h1>
              <p className="text-s-base text-gray-60">
                Кабинет {classroomId} — контент доски здесь заглушка, ВКС в compact-режиме.
              </p>
            </div>
            <div className="flex flex-1 items-center justify-center p-8">
              <p className="text-m-base text-gray-60 max-w-md text-center">
                В xi.tutor здесь Yjs/доска. В демо проверяем только overlay ВКС и навигацию.
              </p>
            </div>
          </div>
        </CompactView>
      </DemoChrome>
    </CallsDemoShell>
  );
}
