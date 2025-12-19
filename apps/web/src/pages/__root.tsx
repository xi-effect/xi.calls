import { createRootRouteWithContext, HeadContent, Outlet } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';
import { AuthContextT } from 'common.auth';

interface MyRouterContext {
  auth: AuthContextT;
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  head: () => ({
    meta: [
      {
        title: 'My App',
      },
      {
        name: 'description',
        content: 'A modern web application starter',
      },
    ],
    links: [
      {
        rel: 'icon',
        href: '/favicon.ico',
      },
      {
        rel: 'icon',
        type: 'image/svg+xml',
        href: '/favicon.svg',
      },
      {
        rel: 'icon',
        type: 'image/png',
        sizes: '96x96',
        href: '/favicon-96x96.png',
      },
      {
        rel: 'apple-touch-icon',
        href: '/apple-touch-icon.png',
      },
      {
        rel: 'icon',
        type: 'image/png',
        sizes: '192x192',
        href: '/web-app-manifest-192x192.png',
      },
      {
        rel: 'icon',
        type: 'image/png',
        sizes: '512x512',
        href: '/web-app-manifest-512x512.png',
      },
    ],
    // scripts: [
    //   {
    //     src: 'https://www.google-analytics.com/analytics.js',
    //   },
    // ],
  }),
  // Authentication check can be added here if needed
  // beforeLoad: ({ context, location }) => {
  //   if (!context.auth.isAuthenticated && !location.pathname.includes('/signin')) {
  //     throw redirect({
  //       to: '/signin',
  //       search: {
  //         redirect: location.href,
  //       },
  //     });
  //   }
  // },
  component: () => (
    <>
      <HeadContent />
      <Outlet />
      <TanStackRouterDevtools />
    </>
  ),
});
