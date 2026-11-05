import { request as hostRequest, type Request } from '@jetlinks-web/core'
import { checked, type Query, type Page } from './archive'
import type { CashierCompany, PaymentRecord } from './financeCashier'
const request: Pick<Request, 'get' | 'post'> = hostRequest
const base = (project: string) => `/property/finance/projects/${encodeURIComponent(project)}/refunds`
export interface RefundInput {
  items: { id: string; version: number }[]
  amount: string
  companyId: string
  method: string
  recordedId?: string
  refundedAt: string
  receiverName: string
  reason: string
  attachmentFileId?: string
  attachmentName?: string
}
export interface RefundAllocation {
  sourceLineId: string
  paymentId: string
  receivableId?: string | null
  sourceType: 'RECEIVABLE' | 'TEMPORARY'
  fullName: string
  customerName: string
  subjectName: string
  originalAmount: string
  refundedAmount: string
  amount: string
}
export interface RefundPreview {
  token: string
  businessDate: string
  total: string
  companyName: string
  methodText: string
  bankName?: string
  allocations: RefundAllocation[]
}
export interface RefundLine {
  id: string
  refundId: string
  sourceLineId: string
  paymentId: string
  fullName: string
  customerName: string
  subjectName: string
  amount: string
}
export interface RefundDetail {
  refund: {
    id: string
    amount: string
    companyName: string
    receiverName: string
    refundedAt: string
    methodText: string
    bankName?: string
    status: string
    reason: string
    modifierName?: string
    attachmentFileId?: string
    attachmentName?: string
  }
  lines: RefundLine[]
}
export interface RefundRecord {
  line: RefundLine
  refundedAt: string
  receiverName: string
  companyName: string
  methodText: string
  bankName?: string
  operatorName?: string
}
export interface RefundRequest {
  requestId: string
  token: string
  input: RefundInput
}
export interface PendingRefund {
  request: RefundRequest
  preview: RefundPreview
}
export interface RefundRecovery {
  read: () => PendingRefund | undefined
  write: (value: PendingRefund) => void
  clear: () => void
}
export interface RefundSource extends PaymentRecord {
  companyId: string
}
export const getRefundSources = (project: string, ids: string[]) =>
  request.post<RefundSource[]>(`${base(project)}/sources/_query`, ids, { hiddenError: true }).then(checked)
export const getRefundOptions = (project: string) =>
  request.get<CashierCompany[]>(`${base(project)}/_options`, {}, { hiddenError: true }).then(checked)
export const previewRefund = (project: string, input: RefundInput) =>
  request.post<RefundPreview>(`${base(project)}/_preview`, input, { hiddenError: true }).then(checked)
export const confirmRefund = (project: string, input: RefundRequest) =>
  request
    .post<import('./financeRefundApplication').RefundApplication>(`${base(project)}/_confirm`, input, {
      hiddenError: true
    })
    .then(checked)
export const getRefund = (project: string, id: string) =>
  request.get<RefundDetail>(`${base(project)}/${encodeURIComponent(id)}`, {}, { hiddenError: true }).then(checked)
export const queryRefunds = (project: string, query: Query, signal?: AbortSignal) =>
  request.post<Page<RefundRecord>>(`${base(project)}/_query`, query, { hiddenError: true, signal }).then((response) => {
    checked(response)
    return response
  })
