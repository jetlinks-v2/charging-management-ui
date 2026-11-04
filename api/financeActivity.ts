import { request as hostRequest, type Request } from '@jetlinks-web/core'
import { checked, type Page, type Query } from './archive'
const request: Pick<Request, 'get' | 'post' | 'put' | 'remove'> = hostRequest
const base = (project: string) => `/property/finance/projects/${encodeURIComponent(project)}/activities`
export interface ActivityInput {
  version?: number
  name: string
  activityType: string
  startDate: string
  endDate: string
  subjectId: string
  standardId: string
  offsetArrears: boolean
  offsetStartDate?: string | null
  offsetEndDate?: string | null
  targetIds: string[]
  tiers: { paidMonths: number | null; giftMonths: number | null }[]
  attachments: { fileId: string; fileName: string }[]
  remark?: string
}
export interface ActivitySummary {
  activity: {
    id: string
    version: number
    projectId: string
    name: string
    subjectId: string
    standardId: string
    startDate: string
    endDate: string
    enabled: boolean
    createTime: number
  }
  activityTypeName: string
  subjectName: string
  standardName: string
  runtimeStatus: 'NOT_STARTED' | 'RUNNING' | 'ENDED'
}
export interface ActivitySpace {
  id: string
  parentId?: string
  rootId: string
  name: string
  fullName: string
  spaceTypeName?: string
  leaf: boolean
}
export interface ActivityDetail {
  activity: ActivitySummary['activity']
  config: {
    input: ActivityInput
    activityTypeName: string
    subjectName: string
    standardName: string
    targets: ActivitySpace[]
  }
  runtimeStatus: ActivitySummary['runtimeStatus']
}
export interface ActivityOptions {
  spaces: ActivitySpace[]
  types: { value: string; text: string }[]
  standards: { id: string; subjectId: string; subjectName: string; standardName: string; settlementMethod: string }[]
}
export interface ActivityLog {
  id: string
  operation: string
  operatorName: string
  createTime: number
}
const paged = <T>(response: { success: boolean; result: T; message?: string }) => {
  checked(response)
  return response
}
export const getActivityOptions = (project: string) =>
  request.get<ActivityOptions>(`${base(project)}/_options`, {}, { hiddenError: true }).then(checked)
export const queryActivities = (project: string, query: Query, signal?: AbortSignal) =>
  request.post<Page<ActivitySummary>>(`${base(project)}/_query`, query, { signal, hiddenError: true }).then(paged)
export const getActivity = (project: string, id: string) =>
  request.get<ActivityDetail>(`${base(project)}/${encodeURIComponent(id)}`, {}, { hiddenError: true }).then(checked)
export const saveActivity = (project: string, id: string | undefined, input: ActivityInput) =>
  (id
    ? request.put<ActivityDetail>(`${base(project)}/${encodeURIComponent(id)}`, input, { hiddenError: true })
    : request.post<ActivityDetail>(base(project), input, { hiddenError: true })
  ).then(checked)
export const setActivityState = (project: string, row: ActivitySummary) =>
  request
    .put<ActivityDetail>(
      `${base(project)}/${encodeURIComponent(row.activity.id)}/_state`,
      { version: row.activity.version, enabled: !row.activity.enabled },
      { hiddenError: true }
    )
    .then(checked)
export const changeActivityEnd = (project: string, row: ActivitySummary, endDate: string, extend: boolean) =>
  request
    .put<ActivityDetail>(
      `${base(project)}/${encodeURIComponent(row.activity.id)}/${extend ? '_extend' : '_end'}`,
      { version: row.activity.version, endDate },
      { hiddenError: true }
    )
    .then(checked)
export const deleteActivity = (project: string, row: ActivitySummary) =>
  request
    .remove(
      `${base(project)}/${encodeURIComponent(row.activity.id)}?version=${row.activity.version}`,
      {},
      { hiddenError: true }
    )
    .then(checked)
export const queryActivityLogs = (project: string, id: string, query: Query, signal?: AbortSignal) =>
  request
    .post<Page<ActivityLog>>(`${base(project)}/${encodeURIComponent(id)}/logs/_query`, query, {
      signal,
      hiddenError: true
    })
    .then(paged)
