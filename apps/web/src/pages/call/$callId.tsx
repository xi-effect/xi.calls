import { createFileRoute } from '@tanstack/react-router';
import { Call } from '@xipkg/calls';
import { CompactView } from '@xipkg/calls-compactview';
import { CallsDemoShell } from '../../calls/CallsDemoShell';
import { DemoChrome } from '../../calls/DemoChrome';

export const Route = createFileRoute('/call/$callId')({
  component: CallPage,
});

function CallPage() {
  return (
    <CallsDemoShell>
      <DemoChrome>
        <CompactView>
          <Call />
        </CompactView>
      </DemoChrome>
    </CallsDemoShell>
  );
}
