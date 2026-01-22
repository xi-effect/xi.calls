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
      <div className="max-w-2xl text-center">
        <h1 className="mb-4 text-4xl font-bold">About</h1>
        <p className="text-lg text-gray-600">
          This is a starter template built with modern web technologies.
        </p>
      </div>
    </div>
  );
}
