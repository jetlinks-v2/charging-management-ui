import { request as hostRequest, type Request } from '@jetlinks-web/core'
import { checked } from './archive'
import type { CashierInput, CashierPayer, PaymentDetail, FundingOption } from './financeCashier'
const request: Pick<Request, 'get' | 'post'> = hostRequest
const base = (project: string) => `/property/finance/projects/${encodeURIComponent(project)}/cashier/prepay`
export interface PrepaySetting {
  id: string
  subjectName: string
  standardName: string
  companyId: string
  settlementMethod: string
  effectiveStartDate: string
  effectiveEndDate?: string
  payers: CashierPayer[]
  activities: { id: string; name: string; endDate: string; tiers: { paidMonths: number; giftMonths: number }[] }[]
}
export interface PrepayQuoteInput {
  requestId: string
  settingId: string
  payerRelationshipId: string
  activityId?: string
  paidMonths: number
  giftMonths: number
}
export interface PrepayQuote {
  id: string
  version: number
  status: 'OPEN' | 'EXPIRED' | 'CONFIRMED'
  expiresAt: number
  businessDate: string
  houseName: string
  payerName: string
  payAmount: string
  originalAmount: string
  lines: {
    type: string
    start: string
    end: string
    originalAmount: string
    paidAmount: string
    discountAmount: string
  }[]
  paymentId?: string
}
export interface PrepayConfirmation extends Pick<
  CashierInput,
  'companyId' | 'paidAt' | 'tenders' | 'remark' | 'attachmentName' | 'attachmentFileId'
> {
  requestId: string
  version: number
}
/** 只存已发起收款的原始请求；quote是展示快照，不重新生成或修改支付金额。 */
export interface PendingPrepay {
  projectId: string
  spaceId: string
  quote: PrepayQuote
  request: PrepayConfirmation
  companyName: string
  funding: FundingOption[]
}
export interface PrepayRecovery {
  read: () => PendingPrepay | undefined
  write: (value: PendingPrepay) => void
  clear: () => void
}
export const getPrepayOptions = (project: string, spaceId: string) =>
  request.get<PrepaySetting[]>(`${base(project)}/_options`, { spaceId }, { hiddenError: true }).then(checked)
export const createPrepayQuote = (project: string, input: PrepayQuoteInput) =>
  request.post<PrepayQuote>(`${base(project)}/quotes`, input, { hiddenError: true }).then(checked)
export const confirmPrepay = (project: string, id: string, input: PrepayConfirmation) =>
  request
    .post<PaymentDetail>(`${base(project)}/quotes/${encodeURIComponent(id)}/_confirm`, input, { hiddenError: true })
    .then(checked)
