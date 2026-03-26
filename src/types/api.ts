export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiSuccessResponse<T> {
  data: T;
}

export interface ApiCollectionResponse<T> {
  data: T[];
  meta?: PaginationMeta;
}

export interface ApiMessageResponse {
  success: true;
  message?: string;
}

export interface ApiErrorResponse {
  error: string;
  message: string;
  details?: unknown;
}
