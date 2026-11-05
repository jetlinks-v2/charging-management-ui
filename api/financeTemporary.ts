import { request as hostRequest, type Request } from '@jetlinks-web/core'
import { checked, type Query, type Page } from './archive'
import type { CashierCompany, CashierInput, PaymentDetail, PaymentRecord } from './financeCashier'
import type { HouseContext, HouseInfo, SettingOptions } from './financeSetting'
import type { PaymentRecovery, PaymentRequest } from './paymentConfirmation'
const request: Pick<Request, 'get' | 'post'> = hostRequest
const base = (project: string) => `/property/finance/projects/${encodeURIComponent(project)}/temporary`
export interface TemporaryInput extends Omit<CashierInput, 'items' | 'payerRelationshipId'> {
  spaceId: string
  relationshipId: string
  standardId: string
  startDate: string
  endDate: string
  accountPeriod: string
  quantity?: string
  amount: string
}
export interface TemporaryPreview {
  token: string
  total: string
  fullName: string
  customerName: string
  subjectName: string
  standardName: string
  companyName: string
  funding: { methodText: string; bankName?: string; amount: string }[]
}
export type TemporaryRecovery = PaymentRecovery<TemporaryInput, TemporaryPreview>
export interface TemporaryOptions extends SettingOptions {
  companies: CashierCompany[]
}
export const getTemporaryOptions = (project: string) =>
  request.get<TemporaryOptions>(`${base(project)}/_options`, {}, { hiddenError: true }).then(checked)
export const getTemporaryHouse = (project: string, id: string) =>
  request
    .get<HouseContext>(`${base(project)}/houses/${encodeURIComponent(id)}`, {}, { hiddenError: true })
    .then(checked)
export const queryTemporaryHouses = (
  project: string,
  query: { keyword?: string; pageIndex: number; pageSize: number }
) => request.post<Page<HouseInfo>>(`${base(project)}/houses/_query`, query, { hiddenError: true }).then(checked)
export const previewTemporary = (project: string, input: TemporaryInput) =>
  request.post<TemporaryPreview>(`${base(project)}/_preview`, input, { hiddenError: true }).then(checked)
export const collectTemporary = (project: string, input: PaymentRequest<TemporaryInput>) =>
  request.post<PaymentDetail>(`${base(project)}/_collect`, input, { hiddenError: true }).then(checked)
export const getTemporaryPayment = (project: string, id: string) =>
  request.get<PaymentDetail>(`${base(project)}/${encodeURIComponent(id)}`, {}, { hiddenError: true }).then(checked)
export const queryTemporaryPayments = (project: string, query: Query, signal?: AbortSignal) =>
  request.post<Page<PaymentRecord>>(`${base(project)}/_query`, query, { hiddenError: true, signal }).then((r) => {
    checked(r)
    return r
  })
