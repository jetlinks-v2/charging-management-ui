import { request as hostRequest, type Request } from '@jetlinks-web/core'
import { checked, type Query, type Page } from './archive'
import type { ChargeSetting } from './financeSetting'
import { excelResponse } from '../utils/archiveFiles'
const request: Pick<Request, 'get' | 'post'> = hostRequest
const id = encodeURIComponent
const base = (project: string) => `/property/finance/projects/${id(project)}/receivables`
export type ReceivableAction = 'FREEZE' | 'UNFREEZE' | 'DELETE'
export interface Receivable {
  id: string
  projectId: string
  spaceId: string
  fullName: string
  customerName: string
  subjectName: string
  standardName: string
  configVersion: number
  version: number
  periodStart: string
  periodEnd: string
  calcStartDate: string
  calcEndDate: string
  dueDate: string
  calculatedAsOfDate: string
  accruedAsOfDate: string
  periodStatus: 'OPEN' | 'CLOSED'
  frozen: boolean
  financialClosed: boolean
  contractReceivableAmount: string
  accruedReceivableAmount: string
  adjustmentAmount: string
  assessmentAmount: string
  temporaryDispatchAmount: string
  feeReductionAmount: string
  accruedLateFeeAmount: string
  lateFeeReductionAmount: string
  finalLateFeeAmount: string
  actualReceivableAmount: string
  paidAmount: string
  arrears: string
  allowedOperations: string[]
  snapshot?: ChargeSetting['snapshot']
}
export interface ReceivableLog {
  id: string
  operation: string
  reason: string
  operatorName: string
  createTime: number
  beforeVersion: number
  afterVersion: number
  before: Partial<Receivable> & { deleted?: boolean }
  after: Partial<Receivable> & { deleted?: boolean }
}
const pageResponse = <T>(response: { success: boolean; result: T; message?: string }) => {
  checked(response)
  return response
}
export const queryReceivables = (project: string, query: Query, signal?: AbortSignal) =>
  request.post<Page<Receivable>>(`${base(project)}/_query`, query, { hiddenError: true, signal }).then(pageResponse)
export const getReceivable = (project: string, key: string) =>
  request.get<Receivable>(`${base(project)}/${id(key)}`, {}, { hiddenError: true }).then(checked)
export const queryReceivableLogs = (project: string, key: string, query: Query) =>
  request
    .post<Page<ReceivableLog>>(`${base(project)}/${id(key)}/logs/_query`, query, { hiddenError: true })
    .then(pageResponse)
export const changeReceivable = (project: string, row: Receivable, action: ReceivableAction, reason: string) =>
  request
    .post(
      `${base(project)}/${id(row.id)}/_${action.toLowerCase()}`,
      { version: row.version, reason },
      { hiddenError: true }
    )
    .then(checked)
export const exportReceivables = (project: string, query: Query) =>
  request.post<Blob>(`${base(project)}/_export`, query, { hiddenError: true, responseType: 'blob' }).then(excelResponse)
