import { request as hostRequest, type Request } from '@jetlinks-web/core'
import type { Page, Query } from './archive'
const request: Pick<Request, 'get' | 'post' | 'put' | 'remove'> = hostRequest
const base = '/property/finance'
const id = encodeURIComponent
export interface CompanyFields {
  companyName: string
  taxNumber: string
  address: string
  phone: string
  depositBank: string
  bankAccount: string
  drawer: string
  reviewer: string
  estateNo: string
  shop?: string
  legalPersonId?: string
  ratepayingNature?: string
  invoiceManufacturerCode?: string
  invoiceManufacturerName?: string
  invoiceExtensionNumber?: string
  departmentId?: string
  thirdpartyVendorId?: string
  quota?: string | null
}
export interface Company extends CompanyFields {
  id: string
  version: number
  modifyTime?: number
  modifierName?: string
}
export interface Bank {
  id?: string
  bankName: string
  bankAccount: string
  defaultBank: boolean
  financingInstitution?: string
  jointLineNumber?: string
  accountName?: string
  accountNumber?: string
  accountBookId?: string
}
export interface CompanyInput extends CompanyFields {
  version?: number
  banks: Bank[]
}
export interface CompanyDetail {
  company: Company
  banks: Bank[]
}
export interface ProjectCompany {
  company: Company
  relation: { id: string; projectId: string; companyId: string; version: number; defaultKey?: string }
}
function checked<T>(response: { success: boolean; result: T; message?: string }) {
  if (!response.success) throw new Error(response.message || '')
  return response.result
}
export const queryCompanies = (query: Query, signal?: AbortSignal) =>
  request.post<Page<Company>>(`${base}/companies/_query`, query, { signal })
export const getCompany = (value: string) => request.get<CompanyDetail>(`${base}/companies/${id(value)}`).then(checked)
export const saveCompany = (value: string | undefined, input: CompanyInput) =>
  (value
    ? request.put<CompanyDetail>(`${base}/companies/${id(value)}`, input)
    : request.post<CompanyDetail>(`${base}/companies`, input)
  ).then(checked)
export const deleteCompany = (value: Company) =>
  request.remove(`${base}/companies/${id(value.id)}?version=${value.version}`).then(checked)
const project = (projectId: string) => `${base}/projects/${id(projectId)}/companies`
export const getProjectCompanies = (projectId: string) =>
  request.get<ProjectCompany[]>(project(projectId)).then(checked)
export const bindProjectCompany = (projectId: string, companyId: string) =>
  request.post<ProjectCompany>(project(projectId), { companyId }).then(checked)
export const defaultProjectCompany = (projectId: string, row: ProjectCompany) =>
  request.put(`${project(projectId)}/${id(row.relation.id)}/default`, { version: row.relation.version }).then(checked)
export const unbindProjectCompany = (projectId: string, row: ProjectCompany) =>
  request.remove(`${project(projectId)}/${id(row.relation.id)}?version=${row.relation.version}`).then(checked)

export const getProjectCompany = (projectId: string, relationId: string) =>
  request.get<CompanyDetail>(`${project(projectId)}/${id(relationId)}`).then(checked)

export const createProjectCompany = (projectId: string, input: CompanyInput) =>
  request.post<ProjectCompany>(`${base}/companies/_create-and-bind/${id(projectId)}`, input).then(checked)

export const queryProjectCompanyCandidates = (projectId: string, query: Query) =>
  request.post<Page<Company>>(`${project(projectId)}/_candidates`, query)
