export type PageInfo = {
  totalCount: number;
  count: number;
  index: number;
  hasNext: boolean;
};

export type ApiResponse<T> = {
  code: number;
  data: T;
  pageInfo?: PageInfo;
};

export function ok<T>(data: T): ApiResponse<T> {
  return {
    code: 200,
    data,
  };
}

export function okList<T>(data: T[], pageInfo: PageInfo): ApiResponse<T[]> {
  return {
    code: 200,
    data,
    pageInfo,
  };
}
