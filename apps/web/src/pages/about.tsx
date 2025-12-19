import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/about')({
  component: AboutPage,
  head: () => ({
    meta: [
      {
        title: 'About',
      },
    ],
  }),
});

function AboutPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center max-w-2xl">
        <h1 className="text-4xl font-bold mb-4">About</h1>
        <p className="text-lg text-gray-600">
          This is a starter template built with modern web technologies.
        </p>
      </div>
    </div>
  );
}

