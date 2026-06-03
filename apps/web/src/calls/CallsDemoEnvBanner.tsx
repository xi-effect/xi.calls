import { useCallsRuntimeConfig } from '@xipkg/calls-providers';
import { useCallStore } from '@xipkg/calls-store';

export const CallsDemoEnvBanner = () => {
  const {
    liveKit: { isDevMode, devToken },
  } = useCallsRuntimeConfig();
  const token = useCallStore((s) => s.token);

  if (isDevMode && devToken && token) {
    return null;
  }

  return (
    <div
      role="status"
      className="border-brand-80 bg-brand-0 text-gray-80 fixed top-2 right-2 left-2 z-[2000] rounded-xl border px-4 py-3 text-sm shadow-lg sm:left-auto sm:max-w-md"
    >
      <p className="font-medium text-gray-100">Демо LiveKit не настроено</p>
      <p className="mt-1">
        Скопируйте <code className="text-brand-100">apps/web/.env.demo.example</code> в{' '}
        <code className="text-brand-100">.env.local</code>, задайте{' '}
        <code className="text-brand-100">VITE_LIVEKIT_DEV_MODE=true</code> и токен от{' '}
        <code className="text-brand-100">livekit-server --dev</code>, перезапустите{' '}
        <code className="text-brand-100">pnpm dev</code>.
      </p>
    </div>
  );
};
