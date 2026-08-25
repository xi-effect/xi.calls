import { useMemo } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { CallsRuntimeConfigProvider } from '@xipkg/calls-providers';
import { PermissionsDialog, SoundAndVideoSettings } from '@xipkg/calls-ui';
import { TooltipProvider } from '@xipkg/tooltip';
import { createCallsRuntimeConfigFromEnv } from '../calls/createCallsRuntimeConfig';
import { DemoFloatingNav } from '../calls/DemoFloatingNav';

import '@xipkg/calls-ui/styles.css';

export const Route = createFileRoute('/sound-and-video')({
  component: SoundAndVideoDemoPage,
  head: () => ({
    meta: [{ title: 'Звук и видео — demo' }],
  }),
});

function SoundAndVideoDemoPage() {
  const runtimeConfig = useMemo(() => createCallsRuntimeConfigFromEnv(), []);

  return (
    <CallsRuntimeConfigProvider config={runtimeConfig}>
      <TooltipProvider>
        <DemoFloatingNav />
        <PermissionsDialog />
        <div className="bg-background-page min-h-dvh overflow-y-auto">
          <div className="mx-auto w-full max-w-xl px-4 py-8 sm:px-6">
            <h1 className="text-text-primary mb-6 text-3xl font-semibold">Звук и видео</h1>
            <SoundAndVideoSettings />
          </div>
        </div>
      </TooltipProvider>
    </CallsRuntimeConfigProvider>
  );
}
