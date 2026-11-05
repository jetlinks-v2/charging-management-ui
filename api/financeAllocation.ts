import { request as hostRequest, type Request } from '@jetlinks-web/core'
import { checked, type Page, type Query } from './archive'
const request: Pick<Request, 'get' | 'post' | 'put' | 'remove'> = hostRequest
export interface AllocationBook {
  id: string
  version: number
  projectId: string
  batchNumber: string
  buyDate: string
  recipientId: string
  recipientUsername: string
  recipientName: string
  billType: string
  billTypeName: string
  billCode: string
  billSource?: string
  billSourceName?: string
  quota?: string
  startNumber: number
  endNumber: number
  numberCount: number
  usedCount: number
  discardedCount: number
  enabled: boolean
  recovered: boolean
  remark?: string
  creatorName: string
  createTime: number
}
export interface AllocationInput {
  version?: number
  buyDate: string
  recipientId: string
  billType: string
  billCode: string
  billSource?: string
  quota?: string
  bookCount: number
  numberCount: number
  startNumber: number
  enabled: boolean
  recovered: boolean
  remark?: string
}
export interface AllocationNumber {
  id: string
  version: number
  bookId: string
  number: number
  used: boolean
  enabled: boolean
}
export interface AllocationLog {
  id: string
  action: string
  numberId?: string
  reason?: string
  modifierName: string
  createTime: number
  beforeSnapshot?: string
  afterSnapshot?: string
}
export interface AllocationOptions {
  types: Record<string, string>
  sources: Record<string, string>
}
export interface AllocationRecipient {
  id: string
  username: string
  name: string
}
const base = (project: string) => `/property/finance/projects/${encodeURIComponent(project)}/allocations`
const paged = <T>(r: { success: boolean; result: T; message?: string }) => {
  checked(r)
  return r
}
export const queryAllocations = (p: string, q: Query, signal?: AbortSignal) =>
  request.post<Page<AllocationBook>>(`${base(p)}/_query`, q, { signal, hiddenError: true }).then(paged)
export const getAllocation = (p: string, id: string) =>
  request.get<AllocationBook>(`${base(p)}/${encodeURIComponent(id)}`, {}, { hiddenError: true }).then(checked)
export const getAllocationOptions = (p: string) =>
  request.get<AllocationOptions>(`${base(p)}/_options`, {}, { hiddenError: true }).then(checked)
export const queryAllocationRecipients = (p: string, pageIndex: number, keywords: string) =>
  request
    .get<
      Page<AllocationRecipient>
    >(`${base(p)}/recipients/_query`, { pageIndex, pageSize: 20, keywords }, { hiddenError: true })
    .then(checked)
export const saveAllocation = (p: string, id: string | undefined, input: AllocationInput) =>
  (id
    ? request.put<AllocationBook>(`${base(p)}/${encodeURIComponent(id)}`, input, { hiddenError: true })
    : request.post<AllocationBook[]>(base(p), [input], { hiddenError: true })
  ).then(checked)
export const deleteAllocation = (p: string, row: AllocationBook) =>
  request
    .remove(`${base(p)}/${encodeURIComponent(row.id)}?version=${row.version}`, {}, { hiddenError: true })
    .then(checked)
export const queryAllocationNumbers = (p: string, id: string, q: Query, signal?: AbortSignal) =>
  request
    .post<
      Page<AllocationNumber>
    >(`${base(p)}/${encodeURIComponent(id)}/numbers/_query`, q, { signal, hiddenError: true })
    .then(paged)
export const queryAllocationLogs = (p: string, id: string, q: Query, signal?: AbortSignal) =>
  request
    .post<Page<AllocationLog>>(`${base(p)}/${encodeURIComponent(id)}/logs/_query`, q, { signal, hiddenError: true })
    .then(paged)
export const setAllocationNumberState = (p: string, book: string, row: AllocationNumber, reason: string) =>
  request
    .put<AllocationNumber>(
      `${base(p)}/${encodeURIComponent(book)}/numbers/${encodeURIComponent(row.id)}/_state`,
      { version: row.version, enabled: !row.enabled, reason },
      { hiddenError: true }
    )
    .then(checked)
