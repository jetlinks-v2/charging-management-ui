import { request as hostRequest, type Request } from '@jetlinks-web/core'
import type { Query, Page } from './archive'
import { excelResponse } from '../utils/archiveFiles'
const request: Pick<Request, 'get' | 'post' | 'put' | 'remove'> = hostRequest
const id = encodeURIComponent
const base = (project: string) => `/property/finance/projects/${id(project)}/tax-items`

/** 公司共享税目；税率提交0..1小数，含税和优惠标志遵循0/1契约。 */
export interface TaxInput {
  companyId: string
  version?: number
  goodsName: string
  goodsShortName?: string
  goodsCode: string
  classificationName: string
  specAndTypes?: string
  taxRate: number | null
  unit?: string
  price?: string | null
  includingTaxFlag: number
  favouredPolicyFlag: number
  favouredPolicyName?: string
}
export interface TaxItem extends TaxInput {
  id: string
  version: number
  companyName: string
  sellerTaxNum: string
  enabled: boolean
  goodsId?: string
  syncStatus?: string
  lastSyncTime?: number
  lastSyncError?: string
  modifierName?: string
  modifyTime?: number
}
export interface TaxImportRecord {
  id: string
  companyId: string
  fileName: string
  status: string
  totalCount?: number
  successCount: number
  errorCount?: number
  errorMessage?: string
  finishTime?: number
  createTime: number
  modifierName: string
}
export interface TaxOperation {
  id: string
  operation: string
  beforeSnapshot?: string
  afterSnapshot?: string
  createTime: number
  modifierName: string
}
function checked<T>(response: { success: boolean; result: T; message?: string }): T {
  if (!response.success) throw new Error(response.message || '')
  return response.result
}
function queryResponse<T>(response: { success: boolean; result: T; message?: string }) {
  checked(response)
  return response
}
export const queryTaxItems = (project: string, query: Query, signal?: AbortSignal) =>
  request
    .post<Page<TaxItem>>(`${base(project)}/_query`, query, { signal, hiddenError: true })
    .then(queryResponse)
export const getTaxItem = (project: string, key: string) =>
  request.get<TaxItem>(`${base(project)}/${id(key)}`, {}, { hiddenError: true }).then(checked)
export const saveTaxItem = (project: string, key: string | undefined, input: TaxInput) =>
  (key
    ? request.put<TaxItem>(`${base(project)}/${id(key)}`, input, { hiddenError: true })
    : request.post<TaxItem>(base(project), input, { hiddenError: true })
  ).then(checked)
export const setTaxItemState = (project: string, row: TaxItem) =>
  request
    .put<TaxItem>(
      `${base(project)}/${id(row.id)}/state`,
      { version: row.version, enabled: !row.enabled },
      { hiddenError: true }
    )
    .then(checked)
export const deleteTaxItems = (project: string, rows: TaxItem[]) =>
  request
    .post(
      `${base(project)}/_delete`,
      rows.map(({ id, version }) => ({ id, version })),
      { hiddenError: true }
    )
    .then(checked)
export const getTaxTemplate = (project: string) =>
  request
    .get<Blob>(`${base(project)}/template.xlsx`, {}, { responseType: 'blob', hiddenError: true })
    .then(excelResponse)
export const importTaxItems = (project: string, companyId: string, file: File) => {
  const form = new FormData()
  form.append('file', file)
  return request
    .post<{ recordId: string; count: number }>(`${base(project)}/_import?companyId=${id(companyId)}`, form, {
      hiddenError: true
    })
    .then(checked)
}
export const queryTaxImports = (project: string, query: Query) =>
  request
    .post<Page<TaxImportRecord>>(`${base(project)}/imports/_query`, query, { hiddenError: true })
    .then(queryResponse)
export const queryTaxLogs = (project: string, key: string, query: Query) =>
  request
    .post<Page<TaxOperation>>(`${base(project)}/${id(key)}/logs/_query`, query, { hiddenError: true })
    .then(queryResponse)
