import { createRouter } from '@tanstack/react-router';
import { routeTree } from './routeTree.gen';
import { ErrorPage } from 'calls.ui';

// Create a new router instance
export const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
  scrollRestoration: true,
  context: {
    auth: undefined!, // This will be set after we wrap the app in an AuthProvider
  },
  defaultNotFoundComponent: () => {
    return (
      <ErrorPage
        title="Page Not Found"
        errorCode={404}
        text="The page you are looking for does not exist"
      />
    );
  },
});

// Register the router instance for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }

  // Расширяем параметры поиска для всех маршрутов
  interface SearchParams {
    redirect?: string;
    // Добавьте свои параметры поиска здесь
  }
}
