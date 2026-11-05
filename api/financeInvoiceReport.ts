import { request as hostRequest, type Request } from '@jetlinks-web/core'
import { checked, type Page } from './archive'
import { excelResponse } from '../utils/archiveFiles'
const request: Pick<Request, 'post'> = hostRequest
export type InvoiceGroup = 'DETAIL' | 'PROJECT' | 'SUBJECT'
export type InvoiceStatus = 'UNISSUED' | 'PARTIAL' | 'INVOICED' | 'REVERSED'
export type InvoiceSource = 'RECEIVABLE' | 'TEMP_PAYMENT' | 'FUND_TOPUP'
export interface InvoiceReportInput {
  projectIds: string[]
  spaceIds: string[]
  subjectIds: string[]
  customerName?: string
  fullName?: string
  sourceId?: string
  sourceType?: InvoiceSource
  invoiceNo?: string
  invoiceType?: '1' | '2'
  invoiceStatus?: InvoiceStatus
  invoiceDateStart?: string
  invoiceDateEnd?: string
  groupBy: InvoiceGroup
  pageIndex: number
  pageSize: number
}
export interface InvoiceAmounts {
  receivableAmount: string
  receivedAmount: string
  invoicedAmount: string
  uninvoicedAmount: string
}
export interface InvoiceRow {
  id?: string
  sourceType?: InvoiceSource
  projectId?: string
  projectName?: string
  spaceId?: string
  fullName?: string
  customerName?: string
  subjectId?: string
  subjectName?: string
  invoiceStatus?: InvoiceStatus
  documentId?: string
  invoiceNo?: string
  invoiceType?: '1' | '2'
  invoiceDate?: string
  buyerName?: string
  rowCount: number
  amounts: InvoiceAmounts
}
export interface InvoiceReport {
  groupBy: InvoiceGroup
  summary: InvoiceAmounts
  page: Page<InvoiceRow>
}
const base = '/property/finance/reports/invoices'
export const queryInvoiceReport = (input: InvoiceReportInput, signal?: AbortSignal) =>
  request.post<InvoiceReport>(`${base}/_query`, input, { hiddenError: true, signal }).then(checked)
export const exportInvoiceReport = (input: InvoiceReportInput, format: 'excel' | 'pdf') =>
  request
    .post<Blob>(`${base}/_export/${format}`, input, { hiddenError: true, responseType: 'blob' })
    .then(excelResponse)
