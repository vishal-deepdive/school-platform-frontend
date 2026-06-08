export interface ApiError {
  detail: string;
  code?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
}

export interface SelectOption {
  value: string;
  label: string;
}
