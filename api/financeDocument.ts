import { request as hostRequest, type Request } from '@jetlinks-web/core'
import { checked, type Page, type Query } from './archive'
import type { PaymentRequest } from './paymentConfirmation'

const request: Pick<Request, 'get' | 'post' | 'put'> = hostRequest
export type DocumentType = 'INVOICE' | 'RECEIPT'
export type DocumentSourceType = 'RECEIVABLE' | 'TEMP_PAYMENT'
export interface DocumentBuyer {
  name: string
  taxNum?: string
  phone?: string
  email?: string
  address?: string
  depositBank?: string
  bankAccount?: string
  extensionNumber?: string
}
export interface DifferenceVoucher {
  type: string
  number?: string
  electronicInvoiceNumber?: string
  invoiceCode?: string
  invoiceNumber?: string
  date: string
  amount: string
  remark?: string
  attachmentFileId: string
  attachmentFileName: string
}
export interface DocumentItem {
  sourceType: DocumentSourceType
  sourceId: string
  amount: string
  collectionMethod: 'FULL' | 'DIFFERENTIAL'
  differenceAmount: string
  voucher?: DifferenceVoucher
}
export interface DocumentInput {
  documentType: DocumentType
  companyId: string
  buyer: DocumentBuyer
  invoiceType?: '1' | '2'
  remark?: string
  items: DocumentItem[]
}
export interface DocumentRule {
  version: number | null
  timeLimitType: 'NATURAL_YEAR' | 'CUSTOM_DAYS'
  limitDays: number | null
  maxReopenTimes: number | null
}
export interface DocumentCandidate {
  sourceType: DocumentSourceType
  sourceId: string
  spaceId: string
  fullName: string
  customerId: string
  customerName: string
  subjectName: string
  standardName: string
  startDate?: string
  endDate?: string
  companyId: string
  companyName: string
  allowedAmount: string
  paidAmount: string
  availableAmount: string
  paidAt?: string
  taxRate: string
  goodsCode: string
  selectable: boolean
  unavailableCode?: string
}
export interface DocumentPreviewLine extends DocumentItem {
  spaceId: string
  fullName: string
  customerId: string
  customerName: string
  subjectName: string
  standardName: string
  startDate?: string
  endDate?: string
  availableAmount: string
  taxRate: string
  goodsName: string
  goodsCode: string
  outputTax: string
  taxAmount: string
  netAmount: string
}
export interface DocumentPreview {
  token: string
  documentType: DocumentType
  companyId: string
  companyName: string
  sellerTaxNum: string
  customerId: string
  customerName: string
  buyer: DocumentBuyer
  invoiceType?: string
  issueScene: string
  businessDate: string
  amount: string
  taxAmount: string
  netAmount: string
  rule: DocumentRule
  lines: DocumentPreviewLine[]
}
export interface DocumentRecord {
  id: string
  version: number
  projectId: string
  documentType: DocumentType
  documentNumber: string
  channel: 'SIMULATED' | 'INTERNAL'
  status: 'SIMULATED_ISSUED' | 'SIMULATED_REVERSED' | 'SIMULATED_RED' | 'ISSUED' | 'VOIDED'
  companyId: string
  companyName: string
  sellerTaxNum: string
  customerId: string
  customerName: string
  buyerName: string
  invoiceType?: string
  issueScene: string
  issuedAt: string
  amount: string
  taxAmount: string
  netAmount: string
  originalDocumentId?: string
  reverseDocumentId?: string
  remark?: string
  modifierName?: string
}
export interface DocumentDetail {
  document: DocumentRecord
  buyer: DocumentBuyer
  rule: DocumentRule
  lines: { line: { id: string }; snapshot: DocumentPreviewLine }[]
}
export interface DocumentOperation {
  id: string
  documentId: string
  resultDocumentId: string
  action: 'ISSUE' | 'REVERSE'
  beforeState?: DocumentRecord['status']
  afterState: DocumentRecord['status']
  reason?: string
  createTime: number
  modifierName?: string
}
export interface DocumentReverseInput {
  id: string
  version: number
  reason: string
}
export interface DocumentReversePreview {
  token: string
  document: DocumentRecord
}
const base = (project: string, type: DocumentType) =>
  `/property/finance/projects/${encodeURIComponent(project)}/${type === 'INVOICE' ? 'invoices' : 'receipts'}`
const queryResponse = <T>(response: { success: boolean; result: T; message?: string }) => {
  checked(response)
  return response
}
export const queryDocuments = (project: string, type: DocumentType, query: Query, signal?: AbortSignal) =>
  request
    .post<Page<DocumentRecord>>(`${base(project, type)}/_query`, query, { hiddenError: true, signal })
    .then(queryResponse)
export const getDocument = (project: string, type: DocumentType, id: string) =>
  request
    .get<DocumentDetail>(`${base(project, type)}/${encodeURIComponent(id)}`, {}, { hiddenError: true })
    .then(checked)
export const queryDocumentLogs = (
  project: string,
  type: DocumentType,
  id: string,
  query: Query,
  signal?: AbortSignal
) =>
  request
    .post<
      Page<DocumentOperation>
    >(`${base(project, type)}/${encodeURIComponent(id)}/logs/_query`, query, { hiddenError: true, signal })
    .then(queryResponse)
export const queryDocumentCandidates = (
  project: string,
  type: DocumentType,
  input: {
    sourceType: DocumentSourceType
    companyId?: string
    customerId?: string
    keywords?: string
    pageIndex?: number
    pageSize?: number
  },
  signal?: AbortSignal
) =>
  request
    .post<Page<DocumentCandidate>>(`${base(project, type)}/sources/_query`, input, { hiddenError: true, signal })
    .then(queryResponse)
export const previewDocument = (project: string, input: DocumentInput) =>
  request
    .post<DocumentPreview>(`${base(project, input.documentType)}/_preview`, input, { hiddenError: true })
    .then(checked)
export const confirmDocument = (project: string, input: PaymentRequest<DocumentInput>) =>
  request
    .post<DocumentDetail>(`${base(project, input.input.documentType)}/_confirm`, input, { hiddenError: true })
    .then(checked)
export const reverseDocument = (
  project: string,
  type: DocumentType,
  requestInput: PaymentRequest<DocumentReverseInput>
) => {
  const { id, version, reason } = requestInput.input
  const action = type === 'INVOICE' ? '_reverse' : '_void'
  return request
    .post<DocumentDetail>(
      `${base(project, type)}/${encodeURIComponent(id)}/${action}`,
      {
        requestId: requestInput.requestId,
        version,
        reason
      },
      { hiddenError: true }
    )
    .then(checked)
}
const rulePath = (project: string) => `/property/finance/projects/${encodeURIComponent(project)}/document-rule`
export const getDocumentRule = (project: string) =>
  request.get<DocumentRule>(rulePath(project), {}, { hiddenError: true }).then(checked)
export const saveDocumentRule = (project: string, input: DocumentRule & { reason: string }) =>
  request.put<DocumentRule>(rulePath(project), input, { hiddenError: true }).then(checked)
