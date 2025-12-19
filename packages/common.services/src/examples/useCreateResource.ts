import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getAxiosInstance } from 'common.config';
import { postApiConfig, PostQueryKey, GetQueryKey } from 'common.api';
import type { CreateResourceDto, User } from 'common.api';
import { handleError, showSuccess } from '../utils';

/**
 * Example hook for POST request (creating a resource)
 */
export const useCreateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateResourceDto) => {
      const axiosInst = await getAxiosInstance();
      const response = await axiosInst({
        method: postApiConfig[PostQueryKey.CreateUser].method,
        url: postApiConfig[PostQueryKey.CreateUser].getUrl(),
        data,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      return response.data as User;
    },
    onSuccess: () => {
      // Invalidate the users list cache
      queryClient.invalidateQueries({ queryKey: [GetQueryKey.GetUsers] });
      showSuccess('Resource created successfully');
    },
    onError: (error) => {
      handleError(error, 'creating resource');
    },
  });
};

