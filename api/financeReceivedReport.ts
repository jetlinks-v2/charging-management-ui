import { request as hostRequest, type Request } from '@jetlinks-web/core'
import { checked, type Page } from './archive'
import type { HandoverState } from '../utils/collectionDisplay'
import { excelResponse } from '../utils/archiveFiles'
const request: Pick<Request, 'post'> = hostRequest
export type ReceivedGroup = 'DETAIL' | 'PROJECT' | 'SUBJECT' | 'METHOD' | 'SOURCE' | 'COLLECTOR'
export type ReceivedSource =
  | 'RECEIVABLE'
  | 'TEMPORARY'
  | 'REFUND'
  | 'TEMPORARY_REFUND'
  | 'ADVANCE'
  | 'DEPOSIT'
  | 'ADVANCE_REFUND'
  | 'DEPOSIT_REFUND'
export interface ReceivedInput {
  exportMode?: import('./financeReport').ReportExportMode
  collectorId?: string
  projectIds: string[]
  spaceIds: string[]
  subjectIds: string[]
  subjectGroups?: { value?: string; label?: string }[]
  methodGroups?: { value?: string; label?: string }[]
  paymentMethods: string[]
  sourceTypes: ReceivedSource[]
  customerName?: string
  fullName?: string
  paymentNo?: string
  handoverState?: HandoverState
  collectorName?: string
  receivedDateStart?: string
  receivedDateEnd?: string
  groupBy: ReceivedGroup
  pageIndex: number
  pageSize: number
}
export interface ReceivedAmounts {
  unhandedAmount: string
  pendingAmount: string
  approvedAmount: string
  incomeAmount: string
  refundAmount: string
  netAmount: string
  currentPeriodAmount: string | null
  otherPeriodAmount: string | null
}
export interface ReceivedRow {
  id?: string
  sourceId?: string
  sourceNo?: string
  receivableId?: string
  projectId?: string
  projectName?: string
  spaceId?: string
  fullName?: string
  customerName?: string
  subjectId?: string
  subjectName?: string
  receivedAt?: string
  calcStartDate?: string
  calcEndDate?: string
  method?: string
  methodText?: string
  sourceType?: ReceivedSource
  handoverState?: HandoverState
  collectorId?: string
  collectorName?: string
  remark?: string
  rowCount: number
  amounts: ReceivedAmounts
}
export interface ReceivedReport {
  groupBy: ReceivedGroup
  periodEnabled: boolean
  summary: ReceivedAmounts
  page: Page<ReceivedRow>
}
const base = '/property/finance/reports/received'
export const queryReceivedReport = (input: ReceivedInput, signal?: AbortSignal) =>
  request.post<ReceivedReport>(`${base}/_query`, input, { hiddenError: true, signal }).then(checked)
export const exportReceivedReport = (input: ReceivedInput, format: 'excel' | 'pdf') =>
  request
    .post<Blob>(`${base}/_export/${format}`, input, { hiddenError: true, responseType: 'blob' })
    .then(excelResponse)
