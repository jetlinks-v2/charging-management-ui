import { request as hostRequest, type Request } from '@jetlinks-web/core'
import { checked, type Query, type Page } from './archive'
import type { ChargeSetting } from './financeSetting'
import { excelResponse } from '../utils/archiveFiles'
import type { PaymentRequest } from './paymentConfirmation'
const request: Pick<Request, 'get' | 'post' | 'put'> = hostRequest
const id = encodeURIComponent
const base = (project: string) => `/property/finance/projects/${id(project)}/receivables`
export type ReceivableAction = 'FREEZE' | 'UNFREEZE' | 'DELETE'
export type ReceivableReviewAction = 'APPROVE' | 'REJECT' | 'UNAPPROVE'
export interface ReceivableReviewInput {
  action: ReceivableReviewAction
  items: { id: string; version: number }[]
  reason: string
}
export interface ReceivableReviewPreview {
  token: string
  rows: Receivable[]
}
export type ReceivableReviewResult = Pick<
  Receivable,
  'id' | 'spaceId' | 'version' | 'reviewState' | 'reviewedOn' | 'reviewedName' | 'reviewReason'
>
export interface Receivable {
  id: string
  projectId: string
  projectName?: string
  companyId?: string
  paymentLocked?: boolean
  bankCollectionLocked?: boolean
  discountLocked?: boolean
  paymentOccupiedAmount?: string
  spaceId: string
  fullName: string
  price?: string
  usageValue?: string
  incomeExcludingTax?: string
  outputTaxAmount?: string
  paidDate?: string
  collectionDays?: number
  overdueDays?: number
  overdueMonths?: number
  collectionStatus?: 'PAID' | 'PARTIAL' | 'OVERDUE' | 'NOT_DUE' | 'PENDING'
  payStatus?: 'PAID' | 'PARTIAL' | 'UNPAID'
  chargeLocked?: boolean
  deletedFlag?: boolean
  taskName?: string
  createTime?: number
  customerRelationshipId: string
  customerId: string
  customerIds: string[]
  sourceReceivableId?: string
  sourceType?: string
  importId?: string
  accountPeriod?: string
  contractCode?: string
  remark?: string
  customerName: string
  customerNames: string[]
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
  reviewState?: 'PENDING' | 'APPROVED' | 'REJECTED'
  reviewedOn?: string
  reviewedName?: string
  reviewReason?: string
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
export const reviewReceivables = (project: string, input: PaymentRequest<ReceivableReviewInput>) =>
  request
    .post<ReceivableReviewResult[]>(
      `${base(project)}/_${input.input.action.toLowerCase()}`,
      {
        requestId: input.requestId,
        items: input.input.items,
        reason: input.input.reason
      },
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
    .post<ReceivableChangeRecord>(`${base(project)}/${id(key)}/adjustment`, { input, token }, { hiddenError: true })
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
  request
    .post<ReceivableChangeRecord>(`${base(project)}/${id(key)}/split`, { input, token }, { hiddenError: true })
    .then(checked)

export interface ReceivableChangeRecord {
  id: string
  version: number
  receivableId: string
  sourceVersion: number
  fullName: string
  customerName: string
  subjectName: string
  operation: 'ADJUST' | 'SPLIT'
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  reason: string
  applicantName: string
  createTime: number
  reviewReason?: string
  reviewedName?: string
  reviewedAt?: number
}
export interface ReceivableChangeDetail {
  record: ReceivableChangeRecord
  before: Receivable
  input: AdjustmentInput | SplitInput
  preview: {
    delta?: string
    before?: Record<string, string>
    after?: Record<string, string>
    total?: string
    parts?: SplitPreview['parts']
  }
}
export const queryReceivableChanges = (project: string, query: Query, signal?: AbortSignal) =>
  request
    .post<Page<ReceivableChangeRecord>>(`${base(project)}/changes/_query`, query, { hiddenError: true, signal })
    .then(pageResponse)
export const getReceivableChange = (project: string, key: string) =>
  request.get<ReceivableChangeDetail>(`${base(project)}/changes/${id(key)}`, {}, { hiddenError: true }).then(checked)
export const decideReceivableChange = (
  project: string,
  row: BillSelection,
  action: 'approve' | 'reject',
  reason: string
) =>
  request
    .post<ReceivableChangeRecord>(
      `${base(project)}/changes/${id(row.id)}/_${action}`,
      { version: row.version, reason },
      { hiddenError: true }
    )
    .then(checked)

export interface HistoricalImportRecord {
  id: string
  projectId: string
  fileName: string
  status: 'PROCESSING' | 'REVIEWING' | 'SUCCESS' | 'FAILED' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED'
  phase?: string
  processedCount?: number
  version: number
  rejectedCount?: number
  totalCount: number
  successCount: number
  errorCount: number
  errorMessage?: string
  operatorName: string
  createTime: number
  finishTime?: number
}
export const historicalTemplate = (project: string) =>
  request
    .get<Blob>(`${base(project)}/imports/template.xlsx`, {}, { hiddenError: true, responseType: 'blob' })
    .then(excelResponse)
export const importHistorical = (project: string, file: File) => {
  const body = new FormData()
  body.append('file', file)
  return request.post<HistoricalImportRecord>(`${base(project)}/imports`, body, { hiddenError: true }).then(checked)
}
export const retryHistoricalImport = (project: string, record: string) =>
  request.post(`${base(project)}/imports/${encodeURIComponent(record)}/_retry`, {}, { hiddenError: true }).then(checked)
export const queryHistoricalImports = (project: string, query: Query, signal?: AbortSignal) =>
  request
    .post<Page<HistoricalImportRecord>>(`${base(project)}/imports/_query`, query, { hiddenError: true, signal })
    .then(pageResponse)

export interface HistoricalImportLine {
  id: string
  version: number
  lineNumber: number
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  reviewReason?: string
  reviewedName?: string
  reviewedAt?: number
  receivable: Partial<Receivable>
  payload?: Record<string, string>
}
export const queryHistoricalImportLines = (project: string, recordId: string, query: Query, signal?: AbortSignal) =>
  request
    .post<Page<HistoricalImportLine>>(`${base(project)}/imports/${id(recordId)}/lines/_query`, query, {
      hiddenError: true,
      signal
    })
    .then(pageResponse)
/** 批次与明细审核均使用当前版本。服务器以事务保证一批失败不留下部分正式应收。 */
export const decideHistoricalImports = (
  project: string,
  action: 'approve' | 'reject',
  records: BillSelection[],
  reason: string
) =>
  request
    .post<HistoricalImportRecord[]>(
      `${base(project)}/imports/_${action}`,
      { records: records.map(({ id, version }) => ({ id, version })), reason },
      { hiddenError: true }
    )
    .then(checked)
export const decideHistoricalImportLines = (
  project: string,
  record: BillSelection,
  action: 'approve' | 'reject',
  items: BillSelection[],
  reason: string
) =>
  request
    .post<HistoricalImportRecord>(
      `${base(project)}/imports/${id(record.id)}/_${action}`,
      { version: record.version, items: items.map(({ id, version }) => ({ id, version })), reason },
      { hiddenError: true }
    )
    .then(checked)

export type HistoricalLineInput = Pick<
  Receivable,
  | 'fullName'
  | 'customerName'
  | 'subjectName'
  | 'standardName'
  | 'calcStartDate'
  | 'calcEndDate'
  | 'accountPeriod'
  | 'dueDate'
  | 'contractReceivableAmount'
  | 'feeReductionAmount'
  | 'actualReceivableAmount'
  | 'contractCode'
  | 'remark'
>
/** 待审明细修改同时校验批次与行版本，服务器重新解析引用并更新快照。 */
export const editHistoricalImportLine = (
  project: string,
  record: BillSelection,
  line: BillSelection,
  input: HistoricalLineInput
) =>
  request
    .put<{ record: HistoricalImportRecord; line: HistoricalImportLine }>(
      `${base(project)}/imports/${id(record.id)}/lines/${id(line.id)}`,
      { ...input, version: record.version, lineVersion: line.version },
      { hiddenError: true }
    )
    .then(checked)

export interface BillSelection {
  id: string
  version: number
}
export interface PaymentNotice {
  projectName: string
  fullName: string
  customers: string[]
  rows: {
    id: string
    customerName: string
    subjectName: string
    start: string
    end: string
    months: number
    quantity: string
    price: string
    amount: string
  }[]
  total: string
  totalUppercase: string
  printedOn: string
}
export const deleteReceivableBatch = (project: string, items: BillSelection[], reason: string) =>
  request.post(`${base(project)}/_batch-delete`, { items, reason }, { hiddenError: true }).then(checked)
export const previewPaymentNotice = (project: string, items: BillSelection[]) =>
  request.post<PaymentNotice>(`${base(project)}/notice/_preview`, { items }, { hiddenError: true }).then(checked)
