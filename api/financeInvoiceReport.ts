import { exportReportJob } from './financeReportJobs'
import { request as hostRequest, type Request } from '@jetlinks-web/core'
import { checked, type Page } from './archive'
import { excelResponse } from '../utils/archiveFiles'
const request: Pick<Request, 'get' | 'post'> = hostRequest
export type InvoiceGroup = 'DETAIL' | 'PROJECT' | 'SUBJECT'
export type InvoiceStatus = 'UNISSUED' | 'PARTIAL' | 'INVOICED' | 'REVERSED'
export type InvoiceSource = 'RECEIVABLE' | 'TEMP_PAYMENT' | 'FUND_TOPUP'
export interface InvoiceReportInput {
  exportMode?: import('./financeReport').ReportExportMode
  ledger?: boolean
  ticketColor?: 'BLUE' | 'RED'
  ticketStatus?: string
  buyerName?: string
  projectIds: string[]
  spaceIds: string[]
  subjectIds: string[]
  subjectGroups?: { value?: string; label?: string }[]
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
  netAmount?: string
  taxAmount?: string
  differenceAmount?: string
  outputTax?: string
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
  invoiceContent?: string
  remark?: string
  ticketColor?: string
  status?: string
  originalInvoiceNo?: string
  buyerTaxNum?: string
  sellerTaxNum?: string
  companyName?: string
  collectionMethod?: string
  modifierName?: string
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
  request
    .post<InvoiceReport>(`${base}${input.ledger ? '/ledger' : ''}/_query`, input, { hiddenError: true, signal })
    .then(checked)
export const exportInvoiceReport = (input: InvoiceReportInput, format: 'excel' | 'pdf') =>
  input.ledger ? request
    .post<Blob>(`${base}/ledger/_export/${format}`, input, {
      hiddenError: true,
      responseType: 'blob'
    })
    .then(excelResponse) : exportReportJob('invoices',input,format)

export interface ReportDocument {
  id: string
  documentNumber: string
  status: string
  invoiceType?: string
  issuedAt: string
  amount: string
  buyerName: string
  remark?: string
}
export const queryReportDocuments = (project: string, type: InvoiceSource, sourceId: string) =>
  request
    .get<ReportDocument[]>(
      `${base}/${encodeURIComponent(project)}/${encodeURIComponent(type)}/${encodeURIComponent(sourceId)}/documents`,
      {},
      { hiddenError: true }
    )
    .then(checked)
