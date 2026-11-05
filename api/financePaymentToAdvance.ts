import { request as hostRequest, type Request } from '@jetlinks-web/core'
import { checked, type Page } from './archive'
import type { FundsOptions, FundResult } from './financeFunds'
import type { HouseInfo, HouseContext } from './financeSetting'
import type { RefundSource, RefundAllocation } from './financeRefund'
import type { PaymentRequest } from './paymentConfirmation'
const request: Pick<Request, 'get' | 'post'> = hostRequest
const base = (project: string) => `/property/finance/projects/${encodeURIComponent(project)}/payment-to-advance`
export interface PaymentToAdvanceInput {
  items: { id: string; version: number }[]
  companyId: string
  targetCompanyId: string
  spaceId: string
  relationshipId: string
  standardId: string
  amount: string
  occurredAt: string
  reason: string
  startDate?: string
  endDate?: string
  attachmentFileId?: string
  attachmentName?: string
}
export interface PaymentToAdvancePreview {
  token: string
  amount: string
  beforeBalance: string
  afterBalance: string
  fullName: string
  customerName: string
  subjectName: string
  standardName: string
  sourceCompanyName: string
  companyName: string
  allocations: RefundAllocation[]
}
export const getAdvanceSources = (p: string, ids: string[]) =>
  request.post<RefundSource[]>(`${base(p)}/sources`, ids, { hiddenError: true }).then(checked)
export const getAdvanceOptions = (p: string) =>
  request.get<FundsOptions>(`${base(p)}/_options`, {}, { hiddenError: true }).then(checked)
export const getAdvanceHouse = (p: string, id: string) =>
  request.get<HouseContext>(`${base(p)}/houses/${encodeURIComponent(id)}`, {}, { hiddenError: true }).then(checked)
export const queryAdvanceHouses = (p: string, q: { keyword?: string; pageIndex: number; pageSize: number }) =>
  request.post<Page<HouseInfo>>(`${base(p)}/houses/_query`, q, { hiddenError: true }).then(checked)
export const previewPaymentToAdvance = (p: string, input: PaymentToAdvanceInput) =>
  request.post<PaymentToAdvancePreview>(`${base(p)}/_preview`, input, { hiddenError: true }).then(checked)
export const confirmPaymentToAdvance = (p: string, input: PaymentRequest<PaymentToAdvanceInput>) =>
  request.post<FundResult>(`${base(p)}/_confirm`, input, { hiddenError: true }).then(checked)
