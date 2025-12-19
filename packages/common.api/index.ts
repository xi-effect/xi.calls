// Экспорт конфигурации HTTP методов
export { HttpMethod } from './src/config';

// Экспорт примеров API конфигурации
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
} from './src/examples';

// Экспорт типов
export type {
  BaseEntity,
  User,
  CreateResourceDto,
  UpdateResourceDto,
  PaginatedResponse,
  PaginationParams,
} from './src/types';
