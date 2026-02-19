export interface PaginationMeta {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}

export interface StandardResponse<T = any> {
  logId: string;
  statusCode: number;
  success: boolean;
  userMessage: string;
  userMessageCode: string;
  developerMessage: string;
  data?: {
    result?: T;
    meta?: Record<string, any>; // Generalized meta object for stats/metadata
    pagination?: PaginationMeta;
  };
}
