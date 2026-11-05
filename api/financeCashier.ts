import { request as hostRequest, type Request } from '@jetlinks-web/core'
import { checked, type Query, type Page } from './archive'
import type { Receivable } from './financeReceivable'
import type { CashierReduction } from '../utils/cashierTree'
const request: Pick<Request, 'get' | 'post'> = hostRequest
const base = (project: string) => `/property/finance/projects/${encodeURIComponent(project)}/cashier`
export interface FundingOption {
  id: string
  method: string
  text: string
  recordedId?: string
  bankName?: string
}
export interface CashierCompany {
  id: string
  name: string
  funding: FundingOption[]
}
export interface CashierPayer {
  relationshipId: string
  name: string
}
export interface CashierInput {
  companyId: string
  payerName: string
  payerRelationshipId?: string
  paidAt: string
  remark?: string
  attachmentName?: string
  attachmentFileId?: string
  items: { id: string; version: number; amount: string }[]
  tenders: { method: string; recordedId?: string; amount: string }[]
  reduction?: CashierReduction
}
export interface CollectionPreview {
  token: string
  businessDate: string
  total: string
  companyName: string
  payerName: string
  rows: Receivable[]
  allocations: {
    receivableId: string
    tenderIndex: number
    method: string
    methodText: string
    bankName?: string
    amount: string
  }[]
}
export interface PaymentLine {
  id: string
  version: number
  paymentId: string
  receivableId?: string | null
  sourceType: 'RECEIVABLE' | 'TEMPORARY'
  fullName: string
  customerName: string
  subjectName: string
  calcStartDate: string
  calcEndDate: string
  method: string
  methodText: string
  bankName?: string
  bankAccount?: string
  amount: string
  refundedAmount: string
  modifierName?: string
}
export interface PaymentDetail {
  payment: {
    id: string
    companyId: string
    sourceType: 'RECEIVABLE' | 'TEMPORARY'
    amount: string
    companyName: string
    payerName: string
    paidAt: string
    status: string
    remark?: string
    modifierName?: string
    attachmentFileId?: string
    attachmentName?: string
  }
  lines: PaymentLine[]
  snapshot: {
    house?: { fullName: string }
    customer?: { name: string }
    standard?: { standardName: string; subjectName: string; standardCode: string; price?: string }
    startDate?: string
    endDate?: string
    accountPeriod?: string
    quantity?: string
  }
}
export interface PaymentRecord {
  line: PaymentLine
  paidAt: string
  payerName: string
  companyName: string
  operatorName?: string
}
export interface CollectionRequest {
  requestId: string
  token: string
  input: CashierInput
}
export interface PendingCollection {
  request: CollectionRequest
  preview: CollectionPreview
}
export interface CollectionRecovery {
  read: () => PendingCollection | undefined
  write: (value: PendingCollection) => void
  clear: () => void
}
export const getCashierOptions = (project: string) =>
  request.get<CashierCompany[]>(`${base(project)}/_options`, {}, { hiddenError: true }).then(checked)
export const queryCashierBills = (project: string, query: Query) =>
  request.post<Page<Receivable>>(`${base(project)}/bills/_query`, query, { hiddenError: true }).then((response) => {
    checked(response)
    return response
  })
export const getCashierPayers = (project: string, ids: string[]) =>
  request.post<CashierPayer[]>(`${base(project)}/payers/_query`, ids, { hiddenError: true }).then(checked)
export const previewCollection = (project: string, input: CashierInput) =>
  request.post<CollectionPreview>(`${base(project)}/_preview`, input, { hiddenError: true }).then(checked)
export const collectPayment = (project: string, input: CollectionRequest) =>
  request.post<PaymentDetail>(`${base(project)}/_collect`, input, { hiddenError: true }).then(checked)
export const getPayment = (project: string, id: string) =>
  request
    .get<PaymentDetail>(`${base(project)}/payments/${encodeURIComponent(id)}`, {}, { hiddenError: true })
    .then(checked)
export const queryPayments = (project: string, query: Query, signal?: AbortSignal) =>
  request
    .post<Page<PaymentRecord>>(`${base(project)}/payments/_query`, query, { hiddenError: true, signal })
    .then((response) => {
      checked(response)
      return response
    })
