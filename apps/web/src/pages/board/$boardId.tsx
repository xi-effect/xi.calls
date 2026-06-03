import { createFileRoute } from '@tanstack/react-router';
import { CompactView } from '@xipkg/calls-compactview';
import { CallsDemoShell } from '../../calls/CallsDemoShell';
import { DemoChrome } from '../../calls/DemoChrome';

export const Route = createFileRoute('/board/$boardId')({
  component: StandaloneBoardPage,
});

function StandaloneBoardPage() {
  const { boardId } = Route.useParams();

  return (
    <CallsDemoShell>
      <DemoChrome>
        <CompactView>
          <div className="bg-gray-10 flex h-full items-center justify-center p-8">
            <p className="text-m-base text-gray-60 max-w-md text-center">
              Standalone board <strong>{boardId}</strong> — маршрут{' '}
              <code className="text-brand-80">/board/$boardId</code>
            </p>
          </div>
        </CompactView>
      </DemoChrome>
    </CallsDemoShell>
  );
}
