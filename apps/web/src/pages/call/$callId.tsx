import { createFileRoute } from '@tanstack/react-router';
import { Call } from 'calls.main';
import { CompactView } from 'calls.compactview';
import { CallsDemoShell } from '../../calls/CallsDemoShell';
import { DemoChrome } from '../../calls/DemoChrome';

export const Route = createFileRoute('/call/$callId')({
  component: CallPage,
});

function CallPage() {
  return (
    <CallsDemoShell>
      <DemoChrome title="Звонок (full)">
        <CompactView>
          <Call />
        </CompactView>
      </DemoChrome>
    </CallsDemoShell>
  );
}
