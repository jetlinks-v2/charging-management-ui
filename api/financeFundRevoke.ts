import { request as hostRequest, type Request } from '@jetlinks-web/core'
import { checked } from './archive'
import type { FundAccount, FundEntry, FundResult } from './financeFunds'
import type { PaymentRequest } from './paymentConfirmation'
const request: Pick<Request, 'post'> = hostRequest

export interface FundRevokeInput {
  sourceEntryId: string
  accountVersion: number
  occurredAt: string
  reason: string
  attachmentFileId?: string
  attachmentName?: string
}
export interface FundRevokePreview {
  token: string
  amount: string
  beforeBalance: string
  afterBalance: string
  fullName: string
  customerName: string
  subjectName: string
  companyName: string
  cashAmount: string
  standardName: string
  methodText: string
  bankName?: string
}
export interface FundRevokeDraft {
  account?: FundAccount
  entry?: FundEntry
}
const base = (project: string) => `/property/finance/projects/${encodeURIComponent(project)}/funds/topup-revocations`
export const previewFundRevoke = (project: string, input: FundRevokeInput) =>
  request.post<FundRevokePreview>(`${base(project)}/_preview`, input, { hiddenError: true }).then(checked)
export const confirmFundRevoke = (project: string, input: PaymentRequest<FundRevokeInput>) =>
  request.post<FundResult>(`${base(project)}/_confirm`, input, { hiddenError: true }).then(checked)
