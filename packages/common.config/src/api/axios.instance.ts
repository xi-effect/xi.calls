import axios, { AxiosInstance, AxiosError } from 'axios';
import { toast } from 'sonner';

interface AxiosLoader {
  (instance: AxiosInstance): Promise<AxiosInstance>;
}

interface AxiosLoaders {
  request?: AxiosLoader;
  response?: AxiosLoader;
}

// Storage for tracking shown errors
const shownErrors = new Set<string>();

// Function to create a unique error key
const getErrorKey = (error: AxiosError): string => {
  const url = error.config?.url || 'unknown';
  const method = error.config?.method || 'unknown';
  const code = error.code || 'unknown';
  const status = error.response?.status || 'no-status';

  return `${method}:${url}:${code}:${status}`;
};

// Function to show toast with deduplication
const showToastOnce = (
  errorKey: string,
  message: string,
  options?: { duration?: number; description?: string },
) => {
  if (!shownErrors.has(errorKey)) {
    shownErrors.add(errorKey);
    toast.error(message, options);

    // Clear error from cache after 10 seconds
    setTimeout(() => {
      shownErrors.delete(errorKey);
    }, 10000);
  }
};

// Interceptor for handling network errors and internet connection loss
const createNetworkErrorInterceptor = async (instance: AxiosInstance): Promise<AxiosInstance> => {
  instance.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      // Check if error is related to authentication
      const isAuthError =
        error.response?.status === 401 ||
        error.response?.status === 403;
        // Add your auth endpoint check here if needed
        // || error.config?.url?.includes('/auth/check');

      // If this is an auth error, don't show network notifications
      if (isAuthError) {
        return Promise.reject(error);
      }

      const errorKey = getErrorKey(error);

      // First check HTTP status codes if they exist
      if (error.response?.status) {
        const status = error.response.status;

        if (status >= 500) {
          // Server errors (5xx)
          showToastOnce(errorKey, 'Server error. Please try again later.', {
            duration: 4000,
            description: `Server returned error ${status}.`,
          });
        } else if (status === 404) {
          // Resource not found
          showToastOnce(errorKey, 'Resource not found.', {
            duration: 3000,
            description: 'The requested resource may have been moved or deleted.',
          });
        } else if (status === 403) {
          // Access forbidden
          showToastOnce(errorKey, 'Access forbidden.', {
            duration: 3000,
            description: 'You do not have permission to perform this action.',
          });
        } else if (status >= 400 && status < 500) {
          // Other client errors (4xx)
          showToastOnce(errorKey, 'Request error.', {
            duration: 3000,
            description: `Server returned error ${status}.`,
          });
        }

        return Promise.reject(error);
      }

      // Check various types of network errors
      if (error.code === 'ERR_NETWORK') {
        // ERR_NETWORK can mean different things:
        // 1. No internet (navigator.onLine === false)
        // 2. Server unavailable (CORS, DNS, server not responding)
        // 3. Firewall blocking

        if (!navigator.onLine) {
          // No internet connection
          showToastOnce(errorKey, 'No internet connection. Please check your network.', {
            duration: 5000,
            description: 'Try refreshing the page or check your network settings.',
          });
        } else {
          // Internet is available but server is unreachable
          showToastOnce(errorKey, 'Server is unavailable. Please try again later.', {
            duration: 4000,
            description: 'The server may be temporarily unavailable or overloaded.',
          });
        }
      } else if (error.code === 'ECONNABORTED') {
        // Request timeout
        showToastOnce(errorKey, 'Request timeout exceeded.', {
          duration: 4000,
          description: 'The server is not responding. Please try again later.',
        });
      } else if (error.code === 'ERR_BAD_REQUEST') {
        // Bad request
        showToastOnce(errorKey, 'Error in request to server.', {
          duration: 4000,
        });
      } else if (error.code === 'ERR_BAD_RESPONSE') {
        // Bad response from server
        showToastOnce(errorKey, 'Server returned invalid response.', {
          duration: 4000,
          description: 'Try refreshing the page.',
        });
      } else if (error.code === 'ERR_BAD_OPTION') {
        // Invalid option in configuration
        showToastOnce(errorKey, 'Request configuration error.', {
          duration: 4000,
        });
      } else if (error.code === 'ERR_CANCELED') {
        // Request was canceled
        console.log('Request was canceled:', error.message);
        return Promise.reject(error);
      } else if (!error.response && !error.code) {
        // General network error without specific code
        showToastOnce(errorKey, 'Network connection error.', {
          duration: 5000,
          description: 'Check your internet connection and try again.',
        });
      }

      return Promise.reject(error);
    },
  );

  return instance;
};

// We intercept all server responses and on receiving a 401 error,
// force logout the user and redirect to the login form
const createAuthInterceptor = async (instance: AxiosInstance): Promise<AxiosInstance> => {
  instance.interceptors.response.use(
    (response) => response,
    async (error) => {
      if (error.response?.status === 401) {
        console.log('createAuthInterceptor 401');

        // Get logout from useAuth and call it
        // const { logout } = useAuth();
        // logout();
        // redirect({
        //   to: '/signin',
        //   search: {
        //     redirect: location.href,
        //   },
        // });
      }

      return Promise.reject(error);
    },
  );

  return instance;
};

const defaultLoaders: Required<AxiosLoaders> = {
  request: async (instance) => instance,
  response: async (instance) => {
    // Apply interceptors in the correct order
    const instanceWithNetworkErrors = await createNetworkErrorInterceptor(instance);
    const instanceWithAuth = await createAuthInterceptor(instanceWithNetworkErrors);
    return instanceWithAuth;
  },
};

const axiosInstance = axios.create({
  withCredentials: true,
  headers: { 'Content-type': 'application/json; charset=UTF-8' },
});

export const getAxiosInstance = async (): Promise<AxiosInstance> => {
  const { request = defaultLoaders.request, response = defaultLoaders.response } = defaultLoaders;
  return response(await request(axiosInstance));
};
