import { request as hostRequest, type Request } from '@jetlinks-web/core'
import { checked } from './archive'
import type { FundAccount, FundEntry, FundResult } from './financeFunds'
import type { RefundAllocation } from './financeRefund'
import type { PaymentRequest } from './paymentConfirmation'
const request: Pick<Request, 'post'> = hostRequest

export interface FundReturnInput {
  sourceEntryId: string
  accountVersion: number
  amount: string
  occurredAt: string
  reason: string
  attachmentFileId?: string
  attachmentName?: string
}
export interface FundReturnPreview {
  token: string
  amount: string
  beforeBalance: string
  afterBalance: string
  fullName: string
  customerName: string
  subjectName: string
  companyName: string
  allocations: RefundAllocation[]
}
export interface FundReturnDraft {
  account?: FundAccount
  entry?: FundEntry
}
const base = (project: string) => `/property/finance/projects/${encodeURIComponent(project)}/funds/offset-returns`
export const previewFundReturn = (project: string, input: FundReturnInput) =>
  request.post<FundReturnPreview>(`${base(project)}/_preview`, input, { hiddenError: true }).then(checked)
export const confirmFundReturn = (project: string, input: PaymentRequest<FundReturnInput>) =>
  request.post<FundResult>(`${base(project)}/_confirm`, input, { hiddenError: true }).then(checked)
