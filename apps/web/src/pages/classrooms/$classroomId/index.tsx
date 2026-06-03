import { createFileRoute } from '@tanstack/react-router';
import { CompactView } from '@xipkg/calls-compactview';
import { CallsDemoShell } from '../../../calls/CallsDemoShell';
import { DemoChrome } from '../../../calls/DemoChrome';

export const Route = createFileRoute('/classrooms/$classroomId/')({
  component: ClassroomOverviewPage,
});

function ClassroomOverviewPage() {
  return (
    <CallsDemoShell>
      <DemoChrome>
        <CompactView>
          <div className="bg-gray-0 flex h-full items-center justify-center p-8">
            <div className="max-w-lg text-center">
              <h1 className="text-2xl-base mb-2 font-semibold text-gray-100">
                Страница кабинета (заглушка)
              </h1>
              <p className="text-m-base text-gray-60">
                Компактная ВКС в углу — как на overview в xi.tutor. Параметр{' '}
                <code className="text-brand-80">?call=</code> сохраняет сессию при навигации.
              </p>
            </div>
          </div>
        </CompactView>
      </DemoChrome>
    </CallsDemoShell>
  );
}
