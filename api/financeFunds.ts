import { request as hostRequest, type Request } from '@jetlinks-web/core'
import { checked, type Query, type Page } from './archive'
import type { HouseContext, HouseInfo, SettingOptions } from './financeSetting'
import type { CashierCompany } from './financeCashier'
import type { Receivable } from './financeReceivable'
const request: Pick<Request, 'get' | 'post'> = hostRequest
const base = (p: string) => `/property/finance/projects/${encodeURIComponent(p)}/funds`
export type FundType = 'ADVANCE' | 'DEPOSIT'
export type FundAction = 'TOPUP' | 'REFUND' | 'TRANSFER' | 'DEDUCT' | 'OFFSET'
export interface FundAccount {
  id: string
  version: number
  type: FundType
  projectId: string
  companyId: string
  companyName: string
  spaceId: string
  fullName: string
  customerId: string
  relationshipId: string
  customerName: string
  subjectId: string
  subjectName: string
  standardId: string
  standardName: string
  balance: string
}
export interface FundInput {
  action: FundAction
  type: FundType
  accountId?: string
  version?: number
  spaceId?: string
  relationshipId?: string
  standardId?: string
  subjectId?: string
  companyId: string
  amount: string
  quantity?: string
  method?: string
  recordedId?: string
  occurredAt: string
  payerName: string
  reason: string
  startDate?: string
  endDate?: string
  attachmentFileId?: string
  attachmentName?: string
  targetSpaceId?: string
  targetRelationshipId?: string
  targetStandardId?: string
  targetType?: 'ADVANCE'
  items?: { id: string; version: number; amount: string }[]
}
export interface FundEntry {
  id: string
  transactionId: string
  action: string
  amount: string
  cashAmount: string
  beforeBalance: string
  afterBalance: string
  occurredAt: string
  payerName: string
  methodText: string
  bankName?: string
  reason: string
  modifierName?: string
  fullName: string
  customerName: string
  subjectName: string
  companyName: string
  standardName: string
  peerAccountId?: string
  paymentId?: string
}
export interface FundPreview {
  token: string
  amount: string
  beforeBalance: string
  afterBalance: string
  targetBalance?: string
  companyName: string
  fullName: string
  customerName: string
  subjectName: string
  targetFullName?: string
  targetCustomerName?: string
  targetStandardName?: string
  methodText: string
  bankName?: string
  bills: Receivable[]
}
export interface FundResult {
  account: FundAccount
  target?: FundAccount
  entry: FundEntry
}
export interface FundRequest {
  requestId: string
  token: string
  input: FundInput
}
export interface PendingFund {
  request: FundRequest
  preview: FundPreview
}
export interface FundRecovery {
  read: () => PendingFund | undefined
  write: (value: PendingFund) => void
  clear: () => void
}
export interface FundDraft {
  action: FundAction
  type: FundType
  account?: FundAccount
  initialSpace?: string
}
export type FundsOptions = SettingOptions & {
  companies: CashierCompany[]
  subjects?: { id: string; name: string; enabled: boolean }[]
  defaultCompanyId?: string
}
export const getFundsOptions = (p: string) =>
  request.get<FundsOptions>(`${base(p)}/_options`, {}, { hiddenError: true }).then(checked)
export const queryFundsHouses = (p: string, q: Record<string, unknown>) =>
  request.post<Page<HouseInfo>>(`${base(p)}/houses/_query`, q, { hiddenError: true }).then(checked)
export const getFundsHouse = (p: string, id: string) =>
  request.get<HouseContext>(`${base(p)}/houses/${encodeURIComponent(id)}`, {}, { hiddenError: true }).then(checked)
export const getFundQuote = (p: string, standardId: string, companyId: string, quantity: string) =>
  request.post<string>(`${base(p)}/quote`, { standardId, companyId, quantity }, { hiddenError: true }).then(checked)
export const previewFunds = (p: string, input: FundInput) =>
  request
    .post<FundPreview>(`${base(p)}/${input.action.toLowerCase()}/_preview`, input, { hiddenError: true })
    .then(checked)
export const confirmFunds = (p: string, requestInput: FundRequest) =>
  request
    .post<FundResult>(`${base(p)}/${requestInput.input.action.toLowerCase()}/_confirm`, requestInput, {
      hiddenError: true
    })
    .then(checked)
export const queryFunds = (p: string, q: Query, signal?: AbortSignal) =>
  request.post<Page<FundAccount>>(`${base(p)}/_query`, q, { hiddenError: true, signal }).then((r) => {
    checked(r)
    return r
  })
export const getFund = (p: string, id: string) =>
  request.get<FundAccount>(`${base(p)}/${encodeURIComponent(id)}`, {}, { hiddenError: true }).then(checked)
export const queryFundEntries = (p: string, id: string, q: Query, signal?: AbortSignal) =>
  request
    .post<Page<FundEntry>>(`${base(p)}/${encodeURIComponent(id)}/entries/_query`, q, { hiddenError: true, signal })
    .then((r) => {
      checked(r)
      return r
    })
export const queryFundBills = (p: string, id: string, q: Query) =>
  request
    .post<Page<Receivable>>(`${base(p)}/${encodeURIComponent(id)}/bills/_query`, q, { hiddenError: true })
    .then(checked)
