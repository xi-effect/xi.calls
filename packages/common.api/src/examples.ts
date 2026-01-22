import { env } from 'common.env';
import { HttpMethod } from './config';
import type { PaginationParams } from './types';

/**
 * Examples of API configuration for all types of HTTP requests
 * Use these examples as templates for creating your own API endpoints
 */

// ========== GET requests ==========

enum GetQueryKey {
  GetUsers = 'GetUsers',
  GetUserById = 'GetUserById',
  GetUserWithParams = 'GetUserWithParams',
}

const getApiConfig = {
  // Simple GET request
  [GetQueryKey.GetUsers]: {
    getUrl: () => `${env.VITE_SERVER_URL_BACKEND}/api/users/`,
    method: HttpMethod.GET,
  },
  // GET request with path parameter
  [GetQueryKey.GetUserById]: {
    getUrl: (id: number) => `${env.VITE_SERVER_URL_BACKEND}/api/users/${id}/`,
    method: HttpMethod.GET,
  },
  // GET request with query parameters (use URLSearchParams in the request)
  [GetQueryKey.GetUserWithParams]: {
    getUrl: (params?: PaginationParams) => {
      const url = new URL(`${env.VITE_SERVER_URL_BACKEND}/api/users/`);
      if (params?.page) url.searchParams.set('page', params.page.toString());
      if (params?.page_size) url.searchParams.set('page_size', params.page_size.toString());
      if (params?.search) url.searchParams.set('search', params.search);
      return url.toString();
    },
    method: HttpMethod.GET,
  },
};

// ========== POST requests ==========

enum PostQueryKey {
  CreateUser = 'CreateUser',
  CreateResource = 'CreateResource',
}

const postApiConfig = {
  // POST request for creating a resource
  [PostQueryKey.CreateUser]: {
    getUrl: () => `${env.VITE_SERVER_URL_BACKEND}/api/users/`,
    method: HttpMethod.POST,
  },
  [PostQueryKey.CreateResource]: {
    getUrl: () => `${env.VITE_SERVER_URL_BACKEND}/api/resources/`,
    method: HttpMethod.POST,
  },
};

// ========== PUT requests ==========

enum PutQueryKey {
  UpdateUser = 'UpdateUser',
  ReplaceResource = 'ReplaceResource',
}

const putApiConfig = {
  // PUT request for full resource update
  [PutQueryKey.UpdateUser]: {
    getUrl: (id: number) => `${env.VITE_SERVER_URL_BACKEND}/api/users/${id}/`,
    method: HttpMethod.PUT,
  },
  [PutQueryKey.ReplaceResource]: {
    getUrl: (id: number) => `${env.VITE_SERVER_URL_BACKEND}/api/resources/${id}/`,
    method: HttpMethod.PUT,
  },
};

// ========== PATCH requests ==========

enum PatchQueryKey {
  PartialUpdateUser = 'PartialUpdateUser',
  PartialUpdateResource = 'PartialUpdateResource',
}

const patchApiConfig = {
  // PATCH request for partial resource update
  [PatchQueryKey.PartialUpdateUser]: {
    getUrl: (id: number) => `${env.VITE_SERVER_URL_BACKEND}/api/users/${id}/`,
    method: HttpMethod.PATCH,
  },
  [PatchQueryKey.PartialUpdateResource]: {
    getUrl: (id: number) => `${env.VITE_SERVER_URL_BACKEND}/api/resources/${id}/`,
    method: HttpMethod.PATCH,
  },
};

// ========== DELETE requests ==========

enum DeleteQueryKey {
  DeleteUser = 'DeleteUser',
  DeleteResource = 'DeleteResource',
}

const deleteApiConfig = {
  // DELETE request for deleting a resource
  [DeleteQueryKey.DeleteUser]: {
    getUrl: (id: number) => `${env.VITE_SERVER_URL_BACKEND}/api/users/${id}/`,
    method: HttpMethod.DELETE,
  },
  [DeleteQueryKey.DeleteResource]: {
    getUrl: (id: number) => `${env.VITE_SERVER_URL_BACKEND}/api/resources/${id}/`,
    method: HttpMethod.DELETE,
  },
};

// ========== Exports ==========

export {
  getApiConfig,
  GetQueryKey,
  postApiConfig,
  PostQueryKey,
  putApiConfig,
  PutQueryKey,
  patchApiConfig,
  PatchQueryKey,
  deleteApiConfig,
  DeleteQueryKey,
};
