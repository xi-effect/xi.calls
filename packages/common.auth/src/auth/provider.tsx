import * as React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { LoadingScreen } from 'common.ui';
import { AuthContext } from './context';
import type { SignupData, AuthContextT } from './types';

/**
 * Example AuthProvider - adapt to your authentication needs
 * 
 * This is a basic implementation. You should:
 * 1. Implement your authentication API endpoints
 * 2. Add token management (localStorage, cookies, etc.)
 * 3. Add proper error handling
 * 4. Add refresh token logic if needed
 */

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const queryClient = useQueryClient();
  const [isAuthenticated, setIsAuthenticated] = React.useState<boolean | null>(null);

  if (!queryClient) {
    throw new Error('No QueryClient set, use QueryClientProvider to set one');
  }

  // Check authentication status on mount
  React.useEffect(() => {
    // Example: Check if user is authenticated
    // You should implement your own authentication check logic
    // For example, check for a token in localStorage or make an API call
    const checkAuth = async () => {
      // Example implementation:
      // const token = localStorage.getItem('authToken');
      // if (token) {
      //   try {
      //     const response = await getAxiosInstance().get('/api/auth/me');
      //     setIsAuthenticated(true);
      //   } catch {
      //     setIsAuthenticated(false);
      //   }
      // } else {
      //   setIsAuthenticated(false);
      // }
      
      // For now, default to false
      setIsAuthenticated(false);
    };

    checkAuth();
  }, []);

  const login = () => {
    // Example: Implement your login logic
    // You should call your login API and store the token
    // Example:
    // const response = await loginApi(credentials);
    // localStorage.setItem('authToken', response.token);
    setIsAuthenticated(true);
  };

  const logout = () => {
    // Example: Implement your logout logic
    // You should clear tokens and call logout API if needed
    // Example:
    // await logoutApi();
    // localStorage.removeItem('authToken');
    setIsAuthenticated(false);
    queryClient.clear();
  };

  // Example signup mutation - implement your own
  const signup: AuthContextT['signup'] = {
    mutate: async (data: SignupData) => {
      // Example: Implement your signup logic
      // Example:
      // try {
      //   const response = await signupApi(data);
      //   setIsAuthenticated(true);
      //   return response;
      // } catch (error) {
      //   throw error;
      // }
      console.log('Signup not implemented', data);
    },
    mutateAsync: async (data: SignupData) => {
      return signup.mutate(data);
    },
  };

  if (isAuthenticated === null) {
    return <LoadingScreen />;
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout, signup }}>
      {children}
    </AuthContext.Provider>
  );
};
