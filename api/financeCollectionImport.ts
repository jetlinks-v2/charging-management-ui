import { request as hostRequest, type Request } from '@jetlinks-web/core'
import { checked, type Page, type Query } from './archive'
import { excelResponse } from '../utils/archiveFiles'
import type { HistoricalImportRecord, HistoricalImportLine, BillSelection } from './financeReceivable'
import type { ImportAuditAdapter } from '../hooks/finance-receivable/useHistoricalAudit'
export type CollectionImportKind = 'RECEIVED' | 'ADVANCE' | 'DEPOSIT' | 'TEMPORARY'
export type CollectionImportPayload = Record<string, string>
export interface CollectionImportLine {
  id: string
  version: number
  lineNumber: number
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  fullName: string
  customerName: string
  reviewReason?: string
  reviewedName?: string
  reviewedAt?: number
  payload: CollectionImportPayload
}
const request: Pick<Request, 'get' | 'post' | 'put'> = hostRequest
const id = encodeURIComponent
const base = (project: string, kind: CollectionImportKind) =>
  `/property/finance/projects/${id(project)}/collection-imports/${kind}`
const pageResponse = <T>(value: { success: boolean; result: T; message?: string }) => {
  checked(value)
  return value
}
export const collectionImportTemplate = (project: string, kind: CollectionImportKind) =>
  request
    .get<Blob>(`${base(project, kind)}/template.xlsx`, {}, { hiddenError: true, responseType: 'blob' })
    .then(excelResponse)
export const stageCollectionImport = (project: string, kind: CollectionImportKind, file: File) => {
  const body = new FormData()
  body.append('file', file)
  return request.post<HistoricalImportRecord>(base(project, kind), body, { hiddenError: true }).then(checked)
}
export const queryCollectionImports = (
  project: string,
  kind: CollectionImportKind,
  query: Query,
  signal?: AbortSignal
) =>
  request
    .post<Page<HistoricalImportRecord>>(`${base(project, kind)}/_query`, query, { hiddenError: true, signal })
    .then(pageResponse)
/** 收款暂存快照映射到统一审批行；金额保留字符串，避免大额精度损失。 */
export function collectionAuditLine(line: CollectionImportLine): HistoricalImportLine {
  return {
    ...line,
    receivable: {
      ...line.payload,
      fullName: line.fullName || line.payload.fullName,
      customerName: line.customerName || line.payload.customerName,
      calcStartDate: line.payload.startDate,
      calcEndDate: line.payload.endDate,
      actualReceivableAmount: line.payload.amount
    }
  }
}
export const queryCollectionImportLines = async (
  project: string,
  kind: CollectionImportKind,
  batch: string,
  query: Query,
  signal?: AbortSignal
) => {
  const value = await request
    .post<Page<CollectionImportLine>>(`${base(project, kind)}/${id(batch)}/lines/_query`, query, {
      hiddenError: true,
      signal
    })
    .then(pageResponse)
  return { ...value, result: { ...value.result, data: value.result.data.map(collectionAuditLine) } }
}
export const decideCollectionImports = (
  project: string,
  kind: CollectionImportKind,
  action: 'approve' | 'reject',
  records: BillSelection[],
  reason: string
) =>
  request
    .post<HistoricalImportRecord[]>(
      `${base(project, kind)}/_${action}`,
      { records: records.map(({ id, version }) => ({ id, version })), reason },
      { hiddenError: true }
    )
    .then(checked)
export const decideCollectionImportLines = (
  project: string,
  kind: CollectionImportKind,
  batch: BillSelection,
  action: 'approve' | 'reject',
  items: BillSelection[],
  reason: string
) =>
  request
    .post<HistoricalImportRecord>(
      `${base(project, kind)}/${id(batch.id)}/_${action}`,
      { version: batch.version, items: items.map(({ id, version }) => ({ id, version })), reason },
      { hiddenError: true }
    )
    .then(checked)
export const editCollectionImportLine = async (
  project: string,
  kind: CollectionImportKind,
  batch: BillSelection,
  line: BillSelection,
  payload: CollectionImportPayload
) => {
  const result = await request
    .put<{ record: HistoricalImportRecord; line: CollectionImportLine }>(
      `${base(project, kind)}/${id(batch.id)}/lines/${id(line.id)}`,
      { version: batch.version, lineVersion: line.version, payload },
      { hiddenError: true }
    )
    .then(checked)
  return { record: result.record, line: collectionAuditLine(result.line) }
}
/** 共用现有历史应收审批的筛选、并发保护和交互；仅替换收款业务 API。 */
export const collectionAuditAdapter = (kind: CollectionImportKind): ImportAuditAdapter => ({
  query: (project, query, signal) => queryCollectionImports(project, kind, query, signal),
  lines: (project, batch, query, signal) => queryCollectionImportLines(project, kind, batch, query, signal),
  decide: (project, action, records, reason) => decideCollectionImports(project, kind, action, records, reason),
  decideLines: (project, batch, action, lines, reason) =>
    decideCollectionImportLines(project, kind, batch, action, lines, reason),
  maxBatches: 20
})
