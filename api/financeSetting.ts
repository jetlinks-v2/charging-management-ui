import { request as hostRequest, type Request } from '@jetlinks-web/core'
import { checked, type Query, type Page } from './archive'
import type { FinanceStandard } from './financeStandard'
const request: Pick<Request, 'get' | 'post' | 'put' | 'remove'> = hostRequest
const id = encodeURIComponent
const base = (project: string) => `/property/finance/projects/${id(project)}/settings`
export interface HouseInfo {
  spaceId: string
  projectId: string
  name: string
  fullName: string
  spaceTypeName?: string
  spaceLocation?: string
  billingArea: string | number
  buildingArea?: string | number
  insideArea?: string | number
  version: number
}
export interface HouseCustomer {
  relationshipId: string
  customerId: string
  userId: string
  name: string
  telephone?: string
  nature?: string
}
export interface HouseContext {
  house: HouseInfo
  customers: HouseCustomer[]
}
export interface SettingInput {
  spaceId: string
  projectSubjectId: string
  standardId: string
  customerRelationshipIds: string[]
  effectiveStartDate: string
  effectiveEndDate?: string | null
  variableValues: Record<string, string>
  remark?: string
  version?: number
}
export interface ChargeSetting extends Omit<SettingInput, 'variableValues'> {
  id: string
  projectId: string
  fullName: string
  subjectId: string
  subjectName: string
  standardCode: string
  standardName: string
  customerId: string
  customerName: string
  customerNames: string[]
  configVersion: number
  previousVersionId?: string
  status: 'ACTIVE' | 'STOPPED' | 'SUPERSEDED'
  billed: boolean
  version: number
  snapshot: {
    standard: FinanceStandard
    house: HouseInfo
    customer: HouseCustomer
    customers: HouseCustomer[]
    values: Record<string, string>
  }
}
export interface SettingOptions {
  projectSubjects: { id: string; projectId: string; subjectId: string }[]
  standards: FinanceStandard[]
}
export interface SettingSaveResult {
  setting: ChargeSetting
  generated: number
  retained: number
}
const pageResponse = <T>(response: { success: boolean; result: T; message?: string }) => {
  checked(response)
  return response
}
export const getSettingOptions = (project: string) =>
  request.get<SettingOptions>(`${base(project)}/_options`, {}, { hiddenError: true }).then(checked)
export const querySettings = (project: string, query: Query, signal?: AbortSignal) =>
  request.post<Page<ChargeSetting>>(`${base(project)}/_query`, query, { hiddenError: true, signal }).then(pageResponse)
export const getSetting = (project: string, key: string) =>
  request.get<ChargeSetting>(`${base(project)}/${id(key)}`, {}, { hiddenError: true }).then(checked)
export const getSettingHouse = (project: string, space: string) =>
  request.get<HouseContext>(`${base(project)}/houses/${id(space)}`, {}, { hiddenError: true }).then(checked)
export const querySettingHouses = (
  project: string,
  params: { pageIndex: number; pageSize: number; keyword?: string; spaceId?: string }
) => request.get<Page<HouseInfo>>(`${base(project)}/houses`, params, { hiddenError: true }).then(checked)
export const saveSetting = (project: string, key: string | undefined, input: SettingInput, nextVersion = false) =>
  (nextVersion && key
    ? request.post<SettingSaveResult>(`${base(project)}/${id(key)}/_next-version`, input, { hiddenError: true })
    : key
      ? request.put<SettingSaveResult>(`${base(project)}/${id(key)}`, input, { hiddenError: true })
      : request.post<SettingSaveResult>(base(project), input, { hiddenError: true })
  ).then(checked)
export const batchSettings = (project: string, inputs: SettingInput[]) =>
  request.post<SettingSaveResult[]>(`${base(project)}/_batch`, inputs, { hiddenError: true }).then(checked)
export const deleteSetting = (project: string, row: ChargeSetting) =>
  request.remove(`${base(project)}/${id(row.id)}?version=${row.version}`, {}, { hiddenError: true }).then(checked)
export const stopSetting = (project: string, row: ChargeSetting, endDate: string) =>
  request
    .post<ChargeSetting>(
      `${base(project)}/${id(row.id)}/_stop`,
      { version: row.version, endDate },
      { hiddenError: true }
    )
    .then(checked)
export const generateSetting = (project: string, key: string) =>
  request
    .post<{ generated: number; retained: number }>(`${base(project)}/${id(key)}/_generate`, {}, { hiddenError: true })
    .then(checked)

export interface BillingTask {
  id: string
  fullName: string
  kind: 'GENERATE' | 'ACCRUE' | 'CLOSE' | 'LATE_FEE'
  businessDate: string
  status: 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'SKIPPED'
  attempts: number
  generated?: number
  retained?: number
  errorMessage?: string
}
const tasksBase = (project: string) => `/property/finance/projects/${id(project)}/billing-tasks`
export const queryBillingTasks = (project: string, query: Query, signal?: AbortSignal) =>
  request
    .post<Page<BillingTask>>(`${tasksBase(project)}/_query`, query, { hiddenError: true, signal })
    .then(pageResponse)
export const retryBillingTask = (project: string, key: string) =>
  request.post(`${tasksBase(project)}/${id(key)}/_retry`, {}, { hiddenError: true }).then(checked)
