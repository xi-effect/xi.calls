import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getAxiosInstance } from 'common.config';
import { deleteApiConfig, DeleteQueryKey, GetQueryKey } from 'common.api';
import { handleError, showSuccess } from '../utils';

/**
 * Example hook for DELETE request (deleting a resource)
 */
export const useDeleteUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const axiosInst = await getAxiosInstance();
      await axiosInst({
        method: deleteApiConfig[DeleteQueryKey.DeleteUser].method,
        url: deleteApiConfig[DeleteQueryKey.DeleteUser].getUrl(id),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      return id;
    },
    onSuccess: (deletedId) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: [GetQueryKey.GetUserById, deletedId] });
      // Invalidate the list
      queryClient.invalidateQueries({ queryKey: [GetQueryKey.GetUsers] });
      showSuccess('Resource deleted successfully');
    },
    onError: (error) => {
      handleError(error, 'deleting resource');
    },
  });
};
