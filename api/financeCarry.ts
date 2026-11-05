import { request as hostRequest, type Request } from '@jetlinks-web/core'
import { checked, type Page, type Query } from './archive'
const request: Pick<Request, 'get' | 'post' | 'put' | 'remove'> = hostRequest
const id = encodeURIComponent
const base = (project: string) => `/property/finance/projects/${id(project)}/carry-plans`
export type CarryFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY'
export interface CarryInput {
  version?: number
  name: string
  subjectIds: string[]
  periodStart: string
  periodEnd: string
  frequency: CarryFrequency
  executeDay: string
  executeAt: string
  zone: string
  enabled: boolean
  includeLateFee: boolean
  remissionMode: 'NONE' | 'DISCOUNT' | 'FIXED'
  remissionValue?: string | null
}
export interface CarryPlan {
  plan: { id: string; projectId: string; version: number; name: string; enabled: boolean; createTime: number }
  input: CarryInput
}
export interface CarrySubject {
  id: string
  name: string
  code: string
  enabled: boolean
}
export interface CarryRun {
  id: string
  projectId: string
  planId: string
  planVersion: number
  slot: string
  businessDate: string
  status: 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'PARTIAL' | 'CANCELLED'
  attempts: number
  succeeded: number
  failed: number
  skipped: number
  createTime: number
  finishTime?: number
  errorCode?: string
}
export interface CarryWork {
  id: string
  projectId: string
  runId: string
  receivableId: string
  spaceId: string
  fullName: string
  status: 'PENDING' | 'SUCCEEDED' | 'FAILED' | 'SKIPPED'
  attempts: number
  finishTime?: number
  errorCode?: string
}
export interface CarryItem {
  id: string
  accountId?: string
  paymentId?: string
  businessDate: string
  status: string
  reason?: string
  amount: string
  feeReduction: string
  lateFeeReduction: string
}
const page = <T>(response: { success: boolean; result: T; message?: string }) => {
  checked(response)
  return response
}
export const getCarrySubjects = (project: string) =>
  request.get<CarrySubject[]>(`${base(project)}/_options`, {}, { hiddenError: true }).then(checked)
export const queryCarryPlans = (project: string, query: Query, signal?: AbortSignal) =>
  request.post<Page<CarryPlan>>(`${base(project)}/_query`, query, { signal, hiddenError: true }).then(page)
export const getCarryPlan = (project: string, plan: string) =>
  request.get<CarryPlan>(`${base(project)}/${id(plan)}`, {}, { hiddenError: true }).then(checked)
export const saveCarryPlan = (project: string, plan: string | undefined, input: CarryInput) =>
  (plan
    ? request.put<CarryPlan>(`${base(project)}/${id(plan)}`, input, { hiddenError: true })
    : request.post<CarryPlan>(base(project), input, { hiddenError: true })
  ).then(checked)
export const changeCarryState = (project: string, row: CarryPlan) =>
  request
    .put<CarryPlan>(
      `${base(project)}/${id(row.plan.id)}/_state`,
      { version: row.plan.version, enabled: !row.plan.enabled },
      { hiddenError: true }
    )
    .then(checked)
export const deleteCarryPlan = (project: string, row: CarryPlan) =>
  request
    .remove(`${base(project)}/${id(row.plan.id)}?version=${row.plan.version}`, {}, { hiddenError: true })
    .then(checked)
const runs = (project: string, plan: string) => `${base(project)}/${id(plan)}/runs`
export const queryCarryRuns = (project: string, plan: string, query: Query, signal?: AbortSignal) =>
  request.post<Page<CarryRun>>(`${runs(project, plan)}/_query`, query, { signal, hiddenError: true }).then(page)
export const getCarryRun = (project: string, plan: string, run: string) =>
  request.get<CarryRun>(`${runs(project, plan)}/${id(run)}`, {}, { hiddenError: true }).then(checked)
export const queryCarryWorks = (project: string, plan: string, run: string, query: Query, signal?: AbortSignal) =>
  request
    .post<Page<CarryWork>>(`${runs(project, plan)}/${id(run)}/works/_query`, query, { signal, hiddenError: true })
    .then(page)
export const getCarryWork = (project: string, plan: string, run: string, work: string) =>
  request.get<CarryWork>(`${runs(project, plan)}/${id(run)}/works/${id(work)}`, {}, { hiddenError: true }).then(checked)
export const queryCarryItems = (
  project: string,
  plan: string,
  run: string,
  work: string,
  query: Query,
  signal?: AbortSignal
) =>
  request
    .post<
      Page<CarryItem>
    >(`${runs(project, plan)}/${id(run)}/works/${id(work)}/items/_query`, query, { signal, hiddenError: true })
    .then(page)
export const retryCarryRun = (project: string, plan: string, run: string) =>
  request.post<CarryRun>(`${runs(project, plan)}/${id(run)}/_retry`, undefined, { hiddenError: true }).then(checked)
