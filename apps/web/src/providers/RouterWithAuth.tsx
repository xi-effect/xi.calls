import { RouterProvider } from '@tanstack/react-router';
import { AuthProvider, useAuth } from 'common.auth';
import { ThemeProvider } from 'common.theme';
import { NetworkProvider } from 'common.services';
import { router } from '../router';
import { AuthSocketBridge } from './AuthSocketBridge';
import { Toaster } from 'sonner';

const RouterWithAuthContext = () => {
  const auth = useAuth();

  return <RouterProvider router={router} context={{ auth }} />;
};

export const RouterWithAuth = () => {
  return (
    <AuthProvider>
      <AuthSocketBridge>
        <ThemeProvider>
          <NetworkProvider>
              <RouterWithAuthContext />
              <Toaster visibleToasts={3} expand />
          </NetworkProvider>
        </ThemeProvider>
      </AuthSocketBridge>
    </AuthProvider>
  );
};
