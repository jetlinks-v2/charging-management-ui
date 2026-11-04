import { request as hostRequest, type Request } from '@jetlinks-web/core'
import { checked, type Query, type Page } from './archive'
import type { ChargeSetting } from './financeSetting'
import { excelResponse } from '../utils/archiveFiles'
const request: Pick<Request, 'get' | 'post'> = hostRequest
const id = encodeURIComponent
const base = (project: string) => `/property/finance/projects/${id(project)}/receivables`
export type ReceivableAction = 'FREEZE' | 'UNFREEZE' | 'DELETE'
export interface Receivable {
  id: string
  projectId: string
  spaceId: string
  fullName: string
  customerRelationshipId: string
  sourceReceivableId?: string
  customerName: string
  subjectName: string
  standardName: string
  subjectId: string
  standardId: string
  configVersion: number
  version: number
  periodStart: string
  periodEnd: string
  calcStartDate: string
  calcEndDate: string
  dueDate: string
  calculatedAsOfDate: string
  accruedAsOfDate: string
  periodStatus: 'OPEN' | 'CLOSED'
  split?: boolean
  frozen: boolean
  financialClosed: boolean
  contractReceivableAmount: string
  accruedReceivableAmount: string
  adjustmentAmount: string
  assessmentAmount: string
  temporaryDispatchAmount: string
  feeReductionAmount: string
  accruedLateFeeAmount: string
  lateFeeReductionAmount: string
  finalLateFeeAmount: string
  actualReceivableAmount: string
  paidAmount: string
  arrears: string
  allowedOperations: string[]
  snapshot?: ChargeSetting['snapshot']
}
export interface ReceivableLog {
  id: string
  operation: string
  reason: string
  operatorName: string
  createTime: number
  beforeVersion: number
  afterVersion: number
  before: Partial<Receivable> & { deleted?: boolean }
  after: Partial<Receivable> & { deleted?: boolean }
  detail?: {
    input?: Partial<AdjustmentInput>
    preview?: { formula?: AdjustmentPreview['formula'] }
    children?: { id: string; start: string; end: string; customerName: string; amount: string }[]
  }
}
const pageResponse = <T>(response: { success: boolean; result: T; message?: string }) => {
  checked(response)
  return response
}
export const queryReceivables = (project: string, query: Query, signal?: AbortSignal) =>
  request.post<Page<Receivable>>(`${base(project)}/_query`, query, { hiddenError: true, signal }).then(pageResponse)
export const getReceivable = (project: string, key: string) =>
  request.get<Receivable>(`${base(project)}/${id(key)}`, {}, { hiddenError: true }).then(checked)
export const queryReceivableLogs = (project: string, key: string, query: Query) =>
  request
    .post<Page<ReceivableLog>>(`${base(project)}/${id(key)}/logs/_query`, query, { hiddenError: true })
    .then(pageResponse)
export const changeReceivable = (project: string, row: Receivable, action: ReceivableAction, reason: string) =>
  request
    .post(
      `${base(project)}/${id(row.id)}/_${action.toLowerCase()}`,
      { version: row.version, reason },
      { hiddenError: true }
    )
    .then(checked)
export const exportReceivables = (project: string, query: Query) =>
  request.post<Blob>(`${base(project)}/_export`, query, { hiddenError: true, responseType: 'blob' }).then(excelResponse)

export interface AdjustmentInput {
  version: number
  adjustmentMode: 'DIRECT' | 'FORMULA'
  directDirection: 'INCREASE' | 'DECREASE'
  directAmount?: string
  formulaLine: {
    subjectId: string
    standardId: string
    afterCalcStartDate: string
    afterCalcEndDate: string
    afterVariableValues: Record<string, string>
  }
  assessmentAmount?: string
  temporaryDispatchCount: number
  temporaryDispatchUnitPrice?: string
  calculationAsOfDate: string
  lateFeeReductionAmount?: string
  lateFeeReductionReason?: string
  feeReductionAmount?: string
  reason: string
  remark?: string
  attachmentFileIds: string[]
  attachmentNames: Record<string, string>
}
export interface AdjustmentPreview {
  token: string
  delta: string
  referenceBefore: Receivable
  referenceAfter: Receivable
  effectiveBefore: Receivable
  effectiveAfter: Receivable
  calculationAsOfDate: string
  businessDate: string
  formula?: {
    beforeVariables: Record<string, string>
    afterVariables: Record<string, string>
    beforeAmount: string
    afterAmount: string
    beforeStart: string
    beforeEnd: string
    afterStart: string
    afterEnd: string
  }
}
export const previewAdjustment = (project: string, key: string, input: AdjustmentInput) =>
  request
    .post<AdjustmentPreview>(`${base(project)}/${id(key)}/adjustment/_preview`, input, { hiddenError: true })
    .then(checked)
export const submitAdjustment = (project: string, key: string, input: AdjustmentInput, token: string) =>
  request
    .post<Receivable>(`${base(project)}/${id(key)}/adjustment`, { input, token }, { hiddenError: true })
    .then(checked)

export interface SplitInput {
  version: number
  splitDate: string
  scale: number
  firstRelationshipId: string
  secondRelationshipId: string
  reason: string
}
export interface SplitOption {
  relationshipId: string
  name: string
}
export interface SplitPreview {
  token: string
  total: string
  parts: { start: string; end: string; relationshipId: string; customerName: string; amount: string }[]
}
export const getSplitOptions = (project: string, key: string) =>
  request.get<SplitOption[]>(`${base(project)}/${id(key)}/split/_options`, {}, { hiddenError: true }).then(checked)
export const previewSplit = (project: string, key: string, input: SplitInput) =>
  request.post<SplitPreview>(`${base(project)}/${id(key)}/split/_preview`, input, { hiddenError: true }).then(checked)
export const submitSplit = (project: string, key: string, input: SplitInput, token: string) =>
  request.post<Receivable[]>(`${base(project)}/${id(key)}/split`, { input, token }, { hiddenError: true }).then(checked)
