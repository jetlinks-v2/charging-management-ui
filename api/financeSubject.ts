import { request as hostRequest, type Request } from '@jetlinks-web/core'
import type { Page, Query } from './archive'
import { excelResponse } from '../utils/archiveFiles'
const request: Pick<Request, 'get' | 'post' | 'put' | 'remove'> = hostRequest
const base = '/property/finance'
const id = encodeURIComponent
export interface Category {
  id: string
  parentId: string
  name: string
  sortIndex: number
  version: number
}
export interface SubjectInput {
  categoryId: string
  name: string
  feeType: string
  enabled: boolean
  autoInvoice: boolean
  arrearsConfigId: string
  remark?: string
  version?: number
}
export interface Subject extends SubjectInput {
  id: string
  code: string
  version: number
  modifierName?: string
  modifyTime?: number
}
export interface ProjectSubject {
  relation: { id: string; projectId: string; subjectId: string; version: number }
  subject: Subject
}
export interface DictionaryOption {
  value: string
  text: string
}
export interface ArrearsRule {
  id?: string
  overdueDays: number
  levelCode: string
}
export interface ArrearsConfig {
  id: string
  version: number
  name: string
  remark?: string
}
export interface ArrearsInput {
  version?: number
  name: string
  remark?: string
  rules: ArrearsRule[]
}
export interface ArrearsDetail {
  config: ArrearsConfig
  rules: ArrearsRule[]
}
export interface SubjectImportRecord {
  id: string
  fileName: string
  status: 'PROCESSING' | 'SUCCESS' | 'FAILED'
  totalCount?: number
  successCount: number
  errorCount: number
  errorMessage?: string
  createTime: number
  finishTime?: number
  modifierName: string
}
function checked<T>(response: { success: boolean; result: T; message?: string }) {
  if (!response.success) throw new Error(response.message || '')
  return response.result
}
export const getCategories = () =>
  request.get<Category[]>(`${base}/subject-categories`, {}, { hiddenError: true }).then(checked)
export const saveCategory = (value: Partial<Category> & { name: string; parentId: string }) =>
  (value.id
    ? request.put<Category>(`${base}/subject-categories/${id(value.id)}`, value, { hiddenError: true })
    : request.post<Category>(`${base}/subject-categories`, value, { hiddenError: true })
  ).then(checked)
export const deleteCategory = (row: Category) =>
  request
    .remove(`${base}/subject-categories/${id(row.id)}?version=${row.version}`, {}, { hiddenError: true })
    .then(checked)
const category = (value?: string) => (value ? `?categoryId=${id(value)}` : '')
export const querySubjects = (query: Query, categoryId?: string, signal?: AbortSignal) =>
  request.post<Page<Subject>>(`${base}/subjects/_query${category(categoryId)}`, query, { signal, hiddenError: true })
export const getSubject = (value: string) =>
  request.get<Subject>(`${base}/subjects/${id(value)}`, {}, { hiddenError: true }).then(checked)
export const saveSubject = (value: string | undefined, input: SubjectInput) =>
  (value
    ? request.put<Subject>(`${base}/subjects/${id(value)}`, input, { hiddenError: true })
    : request.post<Subject>(`${base}/subjects`, input, { hiddenError: true })
  ).then(checked)
export const deleteSubject = (row: Subject) =>
  request.remove(`${base}/subjects/${id(row.id)}?version=${row.version}`, {}, { hiddenError: true }).then(checked)
export const deleteSubjects = (rows: Subject[]) =>
  request
    .post(
      `${base}/subjects/_delete`,
      rows.map(({ id, version }) => ({ id, version })),
      { hiddenError: true }
    )
    .then(checked)
export const querySubjectImports = (query: Query, signal?: AbortSignal) =>
  request
    .post<Page<SubjectImportRecord>>(`${base}/subjects/imports/_query`, query, { hiddenError: true, signal })
    .then((response) => {
      checked(response)
      return response
    })
export const issueSubjects = (subjectIds: string[], projectIds: string[]) =>
  request
    .post<{ created: number; retained: number }>(
      `${base}/subjects/_issue`,
      { subjectIds, projectIds },
      { hiddenError: true }
    )
    .then(checked)
export const getFeeTypes = () =>
  request.get<DictionaryOption[]>(`${base}/subjects/_fee-types`, {}, { hiddenError: true }).then(checked)
const project = (value: string) => `${base}/projects/${id(value)}/subjects`
export const queryProjectSubjects = (projectId: string, query: Query, categoryId?: string, signal?: AbortSignal) =>
  request.post<Page<ProjectSubject>>(`${project(projectId)}/_query${category(categoryId)}`, query, {
    signal,
    hiddenError: true
  })
export const getProjectSubject = (projectId: string, value: string) =>
  request.get<ProjectSubject>(`${project(projectId)}/${id(value)}`, {}, { hiddenError: true }).then(checked)
export const deleteProjectSubject = (projectId: string, row: ProjectSubject) =>
  request
    .remove(`${project(projectId)}/${id(row.relation.id)}?version=${row.relation.version}`, {}, { hiddenError: true })
    .then(checked)
export const getArrearsOptions = () =>
  request.get<ArrearsConfig[]>(`${base}/arrears-configs/_options`, {}, { hiddenError: true }).then(checked)
export const getArrearsLevels = () =>
  request.get<DictionaryOption[]>(`${base}/arrears-configs/_levels`, {}, { hiddenError: true }).then(checked)
export const queryArrears = (query: Query, signal?: AbortSignal) =>
  request.post<Page<ArrearsConfig>>(`${base}/arrears-configs/_query`, query, { signal, hiddenError: true })
export const getArrears = (value: string) =>
  request.get<ArrearsDetail>(`${base}/arrears-configs/${id(value)}`, {}, { hiddenError: true }).then(checked)
export const saveArrears = (value: string | undefined, input: ArrearsInput) =>
  (value
    ? request.put<ArrearsDetail>(`${base}/arrears-configs/${id(value)}`, input, { hiddenError: true })
    : request.post<ArrearsDetail>(`${base}/arrears-configs`, input, { hiddenError: true })
  ).then(checked)
export const deleteArrears = (row: ArrearsConfig) =>
  request
    .remove(`${base}/arrears-configs/${id(row.id)}?version=${row.version}`, {}, { hiddenError: true })
    .then(checked)
export const subjectTemplate = () =>
  request
    .get<Blob>(`${base}/subjects/template.xlsx`, {}, { responseType: 'blob', hiddenError: true })
    .then(excelResponse)
export const importSubjects = (file: File) => {
  const form = new FormData()
  form.append('file', file)
  return request.post<{ count: number }>(`${base}/subjects/_import`, form, { hiddenError: true }).then(checked)
}
