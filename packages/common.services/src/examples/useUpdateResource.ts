import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getAxiosInstance } from 'common.config';
import { patchApiConfig, PatchQueryKey, GetQueryKey } from 'common.api';
import type { UpdateResourceDto, User } from 'common.api';
import { handleError, showSuccess } from '../utils';

/**
 * Example hook for PATCH request (partial resource update)
 * With optimistic cache update
 */
export const useUpdateUser = () => {
  const queryClient = useQueryClient();

  return useMutation<
    User,
    Error,
    { id: number; data: UpdateResourceDto },
    { previousUser?: User; previousUsers?: User[] }
  >({
    mutationFn: async ({ id, data }) => {
      const axiosInst = await getAxiosInstance();
      const response = await axiosInst({
        method: patchApiConfig[PatchQueryKey.PartialUpdateUser].method,
        url: patchApiConfig[PatchQueryKey.PartialUpdateUser].getUrl(id),
        data,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      return response.data as User;
    },
    // Optimistic update before the request
    onMutate: async ({ id, data }) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({ queryKey: [GetQueryKey.GetUserById, id] });
      await queryClient.cancelQueries({ queryKey: [GetQueryKey.GetUsers] });

      // Save previous values
      const previousUser = queryClient.getQueryData<User>([GetQueryKey.GetUserById, id]);
      const previousUsers = queryClient.getQueryData<User[]>([GetQueryKey.GetUsers]);

      // Optimistically update data
      queryClient.setQueryData<User>([GetQueryKey.GetUserById, id], (old) => {
        if (!old) return old;
        return { ...old, ...data };
      });

      queryClient.setQueryData<User[]>([GetQueryKey.GetUsers], (old) => {
        if (!old) return old;
        return old.map((user) => (user.id === id ? { ...user, ...data } : user));
      });

      return { previousUser, previousUsers };
    },
    // Rollback on error
    onError: (error, { id }, context) => {
      if (context?.previousUser) {
        queryClient.setQueryData([GetQueryKey.GetUserById, id], context.previousUser);
      }
      if (context?.previousUsers) {
        queryClient.setQueryData([GetQueryKey.GetUsers], context.previousUsers);
      }
      handleError(error, 'updating resource');
    },
    // Update after successful response
    onSuccess: (updatedUser, { id }) => {
      queryClient.setQueryData([GetQueryKey.GetUserById, id], updatedUser);
      queryClient.setQueryData<User[]>([GetQueryKey.GetUsers], (old) => {
        if (!old) return old;
        return old.map((user) => (user.id === id ? updatedUser : user));
      });
      showSuccess('Resource updated successfully');
    },
  });
};
