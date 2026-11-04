import { request as hostRequest, type Request } from '@jetlinks-web/core'
import { checked, type Page, type Query } from './archive'
const request: Pick<Request, 'get' | 'post' | 'put' | 'remove'> = hostRequest
export interface SettlementTier {
  minimumAmount: number
  maximumAmount: number | null
  procedureRate: number | null
}
export interface RecordedInput {
  version?: number
  companyId: string
  bankId: string
  sourceCharges: string[]
  patternPayments: string[]
  facilitatorId?: string
  serviceChargeType: 1 | 2 | null
  minimumFee: number | null
  maximumFee: number | null
  fixedAmount: number | null
  tiers: SettlementTier[]
}
export interface RecordedRow extends Omit<RecordedInput, 'sourceCharges' | 'patternPayments' | 'tiers'> {
  id: string
  version: number
  projectId: string
  sourceCharge: string
  patternPayment: string
  sourceChargeText: string
  patternPaymentText: string
  companyName: string
  bankName: string
  modifierName?: string
  modifyTime?: number
}
export interface RecordedDetail {
  record: RecordedRow
  tiers: SettlementTier[]
}
export interface RecordedBatchResult {
  created: RecordedRow[]
  skipped: { sourceCharge: string; patternPayment: string }[]
}
export interface RecordedDictionaryOption {
  value: string
  text: string
}
export interface RecordedBankOption {
  id: string
  bankName: string
  bankAccount: string
}
export interface RecordedCompanyOption {
  id: string
  companyName: string
  banks: RecordedBankOption[]
}
export interface RecordedOptions {
  sources: RecordedDictionaryOption[]
  payments: RecordedDictionaryOption[]
  companies: RecordedCompanyOption[]
}
const base = (projectId: string) => `/property/finance/projects/${encodeURIComponent(projectId)}/recorded`
export const getRecordedOptions = (projectId: string) =>
  request.get<RecordedOptions>(`${base(projectId)}/_options`, {}, { hiddenError: true }).then(checked)
export const queryRecorded = (projectId: string, query: Query, signal?: AbortSignal) =>
  request.post<Page<RecordedRow>>(`${base(projectId)}/_query`, query, { signal })
export const getRecorded = (projectId: string, id: string) =>
  request.get<RecordedDetail>(`${base(projectId)}/${encodeURIComponent(id)}`, {}, { hiddenError: true }).then(checked)
export const createRecorded = (projectId: string, input: RecordedInput) =>
  request.post<RecordedBatchResult>(base(projectId), input, { hiddenError: true }).then(checked)
export const updateRecorded = (projectId: string, id: string, input: RecordedInput) =>
  request
    .put<RecordedDetail>(`${base(projectId)}/${encodeURIComponent(id)}`, input, { hiddenError: true })
    .then(checked)
export const deleteRecorded = (projectId: string, row: RecordedRow) =>
  request
    .remove(`${base(projectId)}/${encodeURIComponent(row.id)}?version=${row.version}`, {}, { hiddenError: true })
    .then(checked)
export const previewRecordedFee = (projectId: string, id: string, amount: number) =>
  request
    .post<number>(`${base(projectId)}/${encodeURIComponent(id)}/_preview-fee`, { amount }, { hiddenError: true })
    .then(checked)
