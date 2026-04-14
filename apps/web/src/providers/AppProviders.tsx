import { QueryProvider } from 'common.config';
import { StrictMode } from 'react';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { RouterRoot } from './RouterWithAuth';

export const AppProviders = () => {
  return (
    <StrictMode>
      <ErrorBoundary>
        <QueryProvider>
          <RouterRoot />
        </QueryProvider>
      </ErrorBoundary>
    </StrictMode>
  );
};
