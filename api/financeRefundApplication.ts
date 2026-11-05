import { request as hostRequest, type Request } from '@jetlinks-web/core'
import { checked, type Page, type Query } from './archive'
const request: Pick<Request, 'get' | 'post'> = hostRequest

export interface RefundApplication {
  id: string
  version: number
  number: string
  status: 'PENDING' | 'REJECTED' | 'SUCCEEDED'
  sourceType: 'PAYMENT' | 'ADVANCE' | 'DEPOSIT'
  amount: string
  receiverName: string
  refundedAt: string
  companyName: string
  methodText: string
  reason: string
  reviewReason?: string
  reviewerName?: string
  reviewedAt?: number
  resultId?: string
}
export interface RefundApplicationLine {
  id: string
  applicationId: string
  fullName: string
  customerName: string
  subjectName: string
  amount: string
  calcStartDate?: string
  calcEndDate?: string
}
export interface RefundApplicationView {
  line: RefundApplicationLine
  number: string
  status: RefundApplication['status']
  sourceType: RefundApplication['sourceType']
  receiverName: string
  refundedAt: string
  methodText: string
  version: number
}
export interface RefundApplicationDetail {
  application: RefundApplication
  lines: RefundApplicationLine[]
}
export interface RefundReviewInput {
  requestId: string
  version: number
  reason: string
}
export interface RefundEditInput {
  version: number
  amount: string
  receiverName: string
  refundedAt: string
  reason: string
}
export interface RefundOperation {
  id: string
  action: string
  reason?: string
  modifierName?: string
  createTime: number
}
const base = (project: string) => `/property/finance/projects/${encodeURIComponent(project)}/refund-applications`
export const queryRefundApplications = (project: string, input: Query, signal?: AbortSignal) =>
  request
    .post<Page<RefundApplicationView>>(`${base(project)}/_query`, input, { hiddenError: true, signal })
    .then((r) => {
      checked(r)
      return r
    })
export const getRefundApplication = (project: string, id: string) =>
  request
    .get<RefundApplicationDetail>(`${base(project)}/${encodeURIComponent(id)}`, {}, { hiddenError: true })
    .then(checked)
export const reviewRefundApplication = (
  project: string,
  id: string,
  action: 'approve' | 'reject',
  input: RefundReviewInput
) =>
  request
    .post<RefundApplication>(`${base(project)}/${encodeURIComponent(id)}/_${action}`, input, { hiddenError: true })
    .then(checked)
export const editRefundApplication = (project: string, id: string, input: RefundEditInput) =>
  request
    .post<RefundApplication>(`${base(project)}/${encodeURIComponent(id)}/_edit`, input, { hiddenError: true })
    .then(checked)
export const getRefundOperations = (project: string, id: string) =>
  request
    .get<RefundOperation[]>(`${base(project)}/${encodeURIComponent(id)}/logs`, {}, { hiddenError: true })
    .then(checked)
