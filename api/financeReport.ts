import { request as hostRequest, type Request } from '@jetlinks-web/core'
import { checked, type Page } from './archive'
import { excelResponse } from '../utils/archiveFiles'
const request: Pick<Request, 'post'> = hostRequest
export type ReportGroup = 'DETAIL' | 'PROJECT' | 'SUBJECT'
export type ReportExportMode = 'CURRENT' | 'DETAIL' | 'BOTH'
export interface ReportInput {
  exportMode?: ReportExportMode
  overdueOnly?: boolean
  projectIds: string[]
  spaceIds: string[]
  subjectIds: string[]
  subjectGroups?: { value?: string; label?: string }[]
  customerName?: string
  fullName?: string
  receivableNo?: string
  receivableDateStart?: string
  receivableDateEnd?: string
  dueDateStart?: string
  dueDateEnd?: string
  collectionStatus?: 'UNPAID' | 'PARTIAL' | 'PAID'
  groupBy: ReportGroup
  pageIndex: number
  pageSize: number
}
export interface ReportAmounts {
  receivableAmount: string
  remissionAmount: string
  netAmount: string
  receivedAmount: string
  unreceivedAmount: string
  overdueAmount: string
  arrearsAmount: string
  collectionRate: string
}
export interface ReportRow {
  id?: string
  projectId?: string
  projectName?: string
  spaceId?: string
  fullName?: string
  customerName?: string
  subjectId?: string
  subjectName?: string
  calcStartDate?: string
  calcEndDate?: string
  receivableDate?: string
  dueDate?: string
  calculatedAsOfDate?: string
  collectionStatus?: 'UNPAID' | 'PARTIAL' | 'PAID'
  remark?: string
  overdueDays?: number
  billCount: number
  amounts: ReportAmounts
}
export interface ReceivableReport {
  groupBy: ReportGroup
  summary: ReportAmounts
  page: Page<ReportRow>
}
const base = '/property/finance/reports/receivables'
export const queryReceivableReport = (input: ReportInput, signal?: AbortSignal) =>
  request.post<ReceivableReport>(`${base}/_query`, input, { hiddenError: true, signal }).then(checked)
export const exportReceivableReport = (input: ReportInput, format: 'excel' | 'pdf') =>
  request
    .post<Blob>(`${base}/_export/${format}`, input, { hiddenError: true, responseType: 'blob' })
    .then(excelResponse)
