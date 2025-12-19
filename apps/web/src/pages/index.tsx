import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/')({
  component: HomePage,
  head: () => ({
    meta: [
      {
        title: 'Home',
      },
    ],
  }),
});

function HomePage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Welcome to Your Starter</h1>
        <p className="text-lg text-gray-600">
          This is a starter template for React applications with TypeScript, Vite, and TanStack Router.
        </p>
      </div>
    </div>
  );
}

