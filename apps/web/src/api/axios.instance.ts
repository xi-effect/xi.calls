import axios, { AxiosInstance, AxiosError } from 'axios';
import { toast } from 'sonner';

interface AxiosLoader {
  (instance: AxiosInstance): Promise<AxiosInstance>;
}

interface AxiosLoaders {
  request?: AxiosLoader;
  response?: AxiosLoader;
}

const shownErrors = new Set<string>();

const getErrorKey = (error: AxiosError): string => {
  const url = error.config?.url || 'unknown';
  const method = error.config?.method || 'unknown';
  const code = error.code || 'unknown';
  const status = error.response?.status || 'no-status';

  return `${method}:${url}:${code}:${status}`;
};

const showToastOnce = (
  errorKey: string,
  message: string,
  options?: { duration?: number; description?: string },
) => {
  if (!shownErrors.has(errorKey)) {
    shownErrors.add(errorKey);
    toast.error(message, options);

    setTimeout(() => {
      shownErrors.delete(errorKey);
    }, 10000);
  }
};

const createNetworkErrorInterceptor = async (instance: AxiosInstance): Promise<AxiosInstance> => {
  instance.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const isAuthError = error.response?.status === 401 || error.response?.status === 403;

      if (isAuthError) {
        return Promise.reject(error);
      }

      const errorKey = getErrorKey(error);

      if (error.response?.status) {
        const status = error.response.status;

        if (status >= 500) {
          showToastOnce(errorKey, 'Server error. Please try again later.', {
            duration: 4000,
            description: `Server returned error ${status}.`,
          });
        } else if (status === 404) {
          showToastOnce(errorKey, 'Resource not found.', {
            duration: 3000,
            description: 'The requested resource may have been moved or deleted.',
          });
        } else if (status === 403) {
          showToastOnce(errorKey, 'Access forbidden.', {
            duration: 3000,
            description: 'You do not have permission to perform this action.',
          });
        } else if (status >= 400 && status < 500) {
          showToastOnce(errorKey, 'Request error.', {
            duration: 3000,
            description: `Server returned error ${status}.`,
          });
        }

        return Promise.reject(error);
      }

      if (error.code === 'ERR_NETWORK') {
        if (!navigator.onLine) {
          showToastOnce(errorKey, 'No internet connection. Please check your network.', {
            duration: 5000,
            description: 'Try refreshing the page or check your network settings.',
          });
        } else {
          showToastOnce(errorKey, 'Server is unavailable. Please try again later.', {
            duration: 4000,
            description: 'The server may be temporarily unavailable or overloaded.',
          });
        }
      } else if (error.code === 'ECONNABORTED') {
        showToastOnce(errorKey, 'Request timeout exceeded.', {
          duration: 4000,
          description: 'The server is not responding. Please try again later.',
        });
      } else if (error.code === 'ERR_BAD_REQUEST') {
        showToastOnce(errorKey, 'Error in request to server.', {
          duration: 4000,
        });
      } else if (error.code === 'ERR_BAD_RESPONSE') {
        showToastOnce(errorKey, 'Server returned invalid response.', {
          duration: 4000,
          description: 'Try refreshing the page.',
        });
      } else if (error.code === 'ERR_BAD_OPTION') {
        showToastOnce(errorKey, 'Request configuration error.', {
          duration: 4000,
        });
      } else if (error.code === 'ERR_CANCELED') {
        console.log('Request was canceled:', error.message);
        return Promise.reject(error);
      } else if (!error.response && !error.code) {
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

const createAuthInterceptor = async (instance: AxiosInstance): Promise<AxiosInstance> => {
  instance.interceptors.response.use(
    (response) => response,
    async (error) => {
      if (error.response?.status === 401) {
        console.log('createAuthInterceptor 401');
      }

      return Promise.reject(error);
    },
  );

  return instance;
};

const defaultLoaders: Required<AxiosLoaders> = {
  request: async (instance) => instance,
  response: async (instance) => {
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
