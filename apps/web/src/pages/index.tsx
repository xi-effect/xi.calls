import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/')({
  beforeLoad: () => {
    throw redirect({
      to: '/call/$callId',
      params: { callId: 'demo' },
      search: { call: 'demo' },
    });
  },
});
