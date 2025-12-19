import { toast } from 'sonner';
import { AxiosError } from 'axios';

/**
 * Universal API error handling
 * Adapt to your needs
 */
export const handleError = (error: unknown, context?: string): void => {
  if (error instanceof AxiosError) {
    const status = error.response?.status;
    const detail = error.response?.data?.detail || error.response?.data?.message;

    // Handle specific errors
    if (detail) {
      toast.error(detail);
      return;
    }

    // Handle by status codes
    const statusMessages: Record<number, string> = {
      400: 'Invalid data',
      401: 'Authentication required',
      403: 'Insufficient permissions',
      404: 'Resource not found',
      422: 'Validation error',
      500: 'Internal server error',
    };

    if (status && statusMessages[status]) {
      toast.error(statusMessages[status]);
      return;
    }

    // General error
    const contextMessage = context ? ` during ${context}` : '';
    toast.error(`An error occurred${contextMessage}`);
  } else {
    toast.error('An unknown error occurred');
  }
};

/**
 * Shows a success notification
 */
export const showSuccess = (message: string): void => {
  toast.success(message);
};
