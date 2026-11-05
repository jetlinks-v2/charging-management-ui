import { request as hostRequest, type Request } from '@jetlinks-web/core'
import type { Page, Query } from './archive'
import type { Category, Subject, DictionaryOption } from './financeSubject'
import type { TaxItem } from './financeTax'
import { checked } from './archive'
import { excelResponse } from '../utils/archiveFiles'
const request: Pick<Request, 'get' | 'post' | 'put' | 'remove'> = hostRequest
const id = encodeURIComponent
const base = (project: string) => `/property/finance/projects/${id(project)}/standards`
export interface FormulaVariable {
  id: string
  projectId?: string
  variableCode: string
  variableName: string
  scopeType: 'SYSTEM' | 'PROJECT'
  valueType: 'DECIMAL'
  description?: string
  enabled: boolean
  sort: number
  version: number
}
export interface StandardInput {
  version?: number
  standardCode: string
  standardName: string
  subjectId: string
  billingMethod: string
  formulaExpression: string
  formulaDisplay: string
  price: string | null
  chargeRoundType: number
  mantissa: number
  settlementMethod: string
  taxItemId: string
  companyId: string
  isDelay: number
  delayCalcForm?: number | null
  delayRoundType?: number | null
  delayBaseType?: string | null
  rateAmount?: string | null
  executeDate?: string | null
  cancelDate?: string | null
  remark?: string
}
export interface FinanceStandard extends StandardInput {
  id: string
  version: number
  projectId: string
  subjectName: string
  categoryId: string
  effectiveStatus: string
  formulaVersion: number
  variablesSnapshot: FormulaVariable[]
  taxSnapshot: Omit<TaxItem, 'id' | 'version' | 'taxRate'> & {
    taxItemId: string
    taxItemVersion: number
    companyVersion: number
    taxRate: number | string
  }
  modifierName?: string
  modifyTime?: number
}
export interface StandardOptions {
  categories: Category[]
  subjects: Subject[]
  variables: FormulaVariable[]
  billingMethods: (DictionaryOption & { defaultExpression: string; defaultDisplay: string })[]
  chargeRoundTypes: { value: number; text: string }[]
  mantissas: { value: number; text: string }[]
  settlementMethods: DictionaryOption[]
  delayCalcForms: { value: number; text: string }[]
  delayRoundTypes: { value: number; text: string }[]
  delayBaseTypes: DictionaryOption[]
  effectiveStatuses: DictionaryOption[]
}
export interface StandardFilters {
  categoryId?: string
  subjectId?: string
  effectiveStatus?: string
  businessDate?: string
}
const suffix = (filters: StandardFilters) =>
  '?' + new URLSearchParams(Object.entries(filters).filter(([, v]) => !!v)).toString()
const checkedQuery = <T>(response: { success: boolean; result: T; message?: string }) => {
  checked(response)
  return response
}
export const getStandardOptions = (project: string) =>
  request.get<StandardOptions>(`${base(project)}/_options`, {}, { hiddenError: true }).then(checked)
export const queryStandards = (project: string, query: Query, filters: StandardFilters = {}, signal?: AbortSignal) =>
  request
    .post<Page<FinanceStandard>>(`${base(project)}/_query${suffix(filters)}`, query, { signal, hiddenError: true })
    .then(checkedQuery)
export const getStandard = (project: string, key: string) =>
  request.get<FinanceStandard>(`${base(project)}/${id(key)}`, {}, { hiddenError: true }).then(checked)
export const saveStandard = (project: string, key: string | undefined, input: StandardInput) =>
  (key
    ? request.put<FinanceStandard>(`${base(project)}/${id(key)}`, input, { hiddenError: true })
    : request.post<FinanceStandard>(base(project), input, { hiddenError: true })
  ).then(checked)
export const deleteStandard = (project: string, row: FinanceStandard) =>
  request.remove(`${base(project)}/${id(row.id)}?version=${row.version}`, {}, { hiddenError: true }).then(checked)
export const exportStandards = (project: string, query: Query, filters: StandardFilters) =>
  request
    .post<Blob>(`${base(project)}/_export${suffix(filters)}`, query, { responseType: 'blob', hiddenError: true })
    .then(excelResponse)
export const validateStandardFormula = (
  project: string,
  input: Pick<StandardInput, 'formulaExpression' | 'formulaDisplay'>
) =>
  request
    .post<
      Pick<FinanceStandard, 'formulaExpression' | 'formulaDisplay' | 'variablesSnapshot'>
    >(`${base(project)}/formula/_validate`, input, { hiddenError: true })
    .then(checked)
export const queryStandardTaxes = (project: string, query: Query, signal?: AbortSignal) =>
  request
    .post<Page<TaxItem>>(`${base(project)}/tax-options/_query`, query, { signal, hiddenError: true })
    .then(checkedQuery)
export const getFormulaVariables = (project: string) =>
  request.get<FormulaVariable[]>(`${base(project)}/variables`, {}, { hiddenError: true }).then(checked)
export type VariableInput = Pick<
  FormulaVariable,
  'variableCode' | 'variableName' | 'description' | 'sort' | 'enabled'
> & { version?: number }
export const saveFormulaVariable = (project: string, key: string | undefined, input: VariableInput) =>
  (key
    ? request.put<FormulaVariable>(`${base(project)}/variables/${id(key)}`, input, { hiddenError: true })
    : request.post<FormulaVariable>(`${base(project)}/variables`, input, { hiddenError: true })
  ).then(checked)
export const deleteFormulaVariable = (project: string, row: FormulaVariable) =>
  request
    .remove(`${base(project)}/variables/${id(row.id)}?version=${row.version}`, {}, { hiddenError: true })
    .then(checked)
