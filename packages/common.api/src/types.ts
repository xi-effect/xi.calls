// Example base types for API
// Replace these types with your application types

export interface BaseEntity {
  id: number;
  created_at: string;
  updated_at: string;
}

// Example type for user
export interface User extends BaseEntity {
  email: string;
  name: string;
  avatar?: string;
}

// Example type for creating a resource
export interface CreateResourceDto {
  name: string;
  description?: string;
}

// Example type for updating a resource
export interface UpdateResourceDto {
  name?: string;
  description?: string;
}

// Example type for paginated response
export interface PaginatedResponse<T> {
  results: T[];
  count: number;
  next: string | null;
  previous: string | null;
}

// Example type for pagination parameters
export interface PaginationParams {
  page?: number;
  page_size?: number;
  search?: string;
}
