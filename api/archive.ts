/** 收费请求共用的分页、查询与响应契约；不重复实现物业基础管理。 */
export type QueryTerm =
  | { column: string; termType: string; value?: unknown; type?: 'and' | 'or' }
  | { terms: QueryTerm[]; type?: 'and' | 'or' }
export interface Query {
  terms: QueryTerm[]
  pageIndex?: number
  pageSize?: number
  sorts?: { name: string; order: string }[]
  paging?: boolean
}
export interface Page<T> {
  data: T[]
  total: number
  pageIndex: number
  pageSize: number
}
export const checked = <T>(response: { success: boolean; result: T; message?: string }): T => {
  if (!response.success) throw new Error(response.message || 'Request rejected')
  return response.result
}
