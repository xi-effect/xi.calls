import { useQuery } from '@tanstack/react-query';
import { getAxiosInstance } from 'common.config';
import { getApiConfig, GetQueryKey } from 'common.api';
import type { User } from 'common.api';

/**
 * Example hook for GET request (fetching a list of resources)
 */
export const useGetUsers = (enabled = true) => {
  return useQuery({
    queryKey: [GetQueryKey.GetUsers],
    queryFn: async () => {
      const axiosInst = await getAxiosInstance();
      const response = await axiosInst({
        method: getApiConfig[GetQueryKey.GetUsers].method,
        url: getApiConfig[GetQueryKey.GetUsers].getUrl(),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      return response.data as User[];
    },
    enabled,
  });
};

/**
 * Example hook for GET request with parameter (fetching a single resource)
 */
export const useGetUserById = (id: number, enabled = true) => {
  return useQuery({
    queryKey: [GetQueryKey.GetUserById, id],
    queryFn: async () => {
      const axiosInst = await getAxiosInstance();
      const response = await axiosInst({
        method: getApiConfig[GetQueryKey.GetUserById].method,
        url: getApiConfig[GetQueryKey.GetUserById].getUrl(id),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      return response.data as User;
    },
    enabled: enabled && !!id,
  });
};

