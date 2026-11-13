import { createFileRoute } from '@tanstack/react-router';
import { CompactView } from '@xipkg/calls-compactview';
import { CallsDemoShell } from '../../../../calls/CallsDemoShell';
import { DemoChrome } from '../../../../calls/DemoChrome';

export const Route = createFileRoute('/classrooms/$classroomId/notes/$noteId')({
  component: NoteInClassroomPage,
});

function NoteInClassroomPage() {
  const { noteId, classroomId } = Route.useParams();

  return (
    <CallsDemoShell>
      <DemoChrome>
        <CompactView>
          <div className="bg-gray-10 flex h-full flex-col">
            <div className="border-gray-10 bg-gray-0 border-b px-6 py-4">
              <h1 className="text-xl-base font-semibold text-gray-100">Демо-заметка #{noteId}</h1>
              <p className="text-s-base text-gray-60">
                Кабинет {classroomId} — контент заметки здесь заглушка, ВКС в compact-режиме.
              </p>
            </div>
            <div className="flex flex-1 items-center justify-center p-8">
              <p className="text-m-base text-gray-60 max-w-md text-center">
                В xi.tutor здесь редактор заметки. В демо проверяем только overlay ВКС и навигацию.
              </p>
            </div>
          </div>
        </CompactView>
      </DemoChrome>
    </CallsDemoShell>
  );
}
