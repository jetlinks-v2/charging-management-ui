import { request as hostRequest, type Request } from '@jetlinks-web/core'
import { checked, type Page, type Query } from './archive'
import type { PaymentRequest } from './paymentConfirmation'

const request: Pick<Request, 'get' | 'post' | 'put'> = hostRequest
export type ClosingAction = 'CLOSE' | 'REOPEN'
export interface AccountingPeriod {
  id: string
  version: number
  projectId: string
  accountYear: number
  accountMonth: string
  startDate: string
  endDate: string
  mode: 'NATURAL' | 'CUSTOM' | 'MANUAL'
  openingDay: number
  status: 'OPEN' | 'CLOSED'
  closedOn?: string
  closedName?: string
}
export interface CalendarInput {
  year: number
  mode: 'NATURAL' | 'CUSTOM'
  openingDay: number
}
export interface CalendarEdit {
  items: { month: string; version: number; start: string; end: string }[]
  reason: string
}
export interface ClosingRule {
  version: number | null
  requireReceivableReview: boolean
}
export interface ClosingInput {
  month: string
  action: ClosingAction
  reason: string
  version: number
}
export interface ClosingPreview {
  token: string
  version: number
  month: string
  action: ClosingAction
  amount: string
  cashAmount: string
  sourceCount: number
  receivableCount: number
  pendingReceivableCount: number
  unhandedCount: number
  pendingHandoverCount: number
  requireReceivableReview: boolean
}
export interface ClosingResult {
  operationId: string
  month: string
  status: 'OPEN' | 'CLOSED'
  version: number
  closedThrough?: string
  amount: string
  cashAmount: string
  sourceCount: number
  receivableCount: number
}
export interface ClosingLog {
  operation: {
    id: string
    accountMonth: string
    action: ClosingAction
    reason: string
    modifierName: string
    createTime: number
    memberCount: number
  }
  result: ClosingResult
}
export interface ClosingMember {
  id: string
  sourceType: string
  sourceId: string
  sourceVersion: number
}
const base = (project: string) => `/property/finance/projects/${encodeURIComponent(project)}`
const calendar = (project: string) => `${base(project)}/accounting-periods`
const closing = (project: string) => `${base(project)}/month-closing`
const page = <T>(response: { success: boolean; result: T; message?: string }) => {
  checked(response)
  return response
}
export const getAccountingYear = async (project: string, year: number, signal?: AbortSignal) =>
  checked<AccountingPeriod[]>(await request.get(`${calendar(project)}/${year}`, {}, { hiddenError: true, signal }))
export const createAccountingYear = async (project: string, input: CalendarInput) =>
  checked<AccountingPeriod[]>(await request.post(calendar(project), input, { hiddenError: true }))
export const editAccountingYear = async (project: string, year: number, input: CalendarEdit) =>
  checked<AccountingPeriod[]>(await request.put(`${calendar(project)}/${year}`, input, { hiddenError: true }))
export const getClosingRule = async (project: string) =>
  checked<ClosingRule>(await request.get(`${closing(project)}/rule`, {}, { hiddenError: true }))
export const saveClosingRule = async (project: string, input: ClosingRule & { reason: string }) =>
  checked<ClosingRule>(await request.put(`${closing(project)}/rule`, input, { hiddenError: true }))
export const previewClosing = async (project: string, input: ClosingInput) =>
  checked<ClosingPreview>(
    await request.post(
      `${closing(project)}/${input.month}/_${input.action.toLowerCase()}/preview`,
      {},
      { hiddenError: true }
    )
  )
/** 动作和月份由路由固定，业务日仅在后端取值；未知结果始终重发原确认载荷。 */
export const confirmClosing = async (project: string, input: PaymentRequest<ClosingInput>) =>
  checked<ClosingResult>(
    await request.post(
      `${closing(project)}/${input.input.month}/_${input.input.action.toLowerCase()}`,
      {
        requestId: input.requestId,
        token: input.token,
        version: input.input.version,
        reason: input.input.reason
      },
      { hiddenError: true }
    )
  )
export const queryClosingLogs = (project: string, month: string, input: Query, signal?: AbortSignal) =>
  request
    .post<Page<ClosingLog>>(`${closing(project)}/${month}/logs/_query`, input, { hiddenError: true, signal })
    .then(page)
export const queryClosingMembers = (project: string, id: string, input: Query, signal?: AbortSignal) =>
  request
    .post<
      Page<ClosingMember>
    >(`${closing(project)}/operations/${encodeURIComponent(id)}/members/_query`, input, { hiddenError: true, signal })
    .then(page)

export interface ClosingSchedule {
  version: number | null
  enabled: boolean
  mode: 'MONTH_END' | 'DAY'
  day: number | null
}
export interface AutomaticClosingRun {
  id: string
  scheduleVersion: number
  accountMonth?: string
  status: 'SUCCEEDED' | 'FAILED'
  errorCode?: string
  operationId?: string
  modifierName?: string
  createTime: number
}
export const getClosingSchedule = async (project: string) =>
  checked<ClosingSchedule>(await request.get(`${closing(project)}/schedule`, {}, { hiddenError: true }))
export const saveClosingSchedule = async (project: string, input: ClosingSchedule & { reason: string }) =>
  checked<ClosingSchedule>(await request.put(`${closing(project)}/schedule`, input, { hiddenError: true }))
export const queryAutomaticClosingRuns = (project: string, input: Query, signal?: AbortSignal) =>
  request
    .post<Page<AutomaticClosingRun>>(`${closing(project)}/automatic-runs/_query`, input, { hiddenError: true, signal })
    .then(page)
