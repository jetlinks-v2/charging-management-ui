import { request as hostRequest, type Request } from '@jetlinks-web/core'
import { checked, type Page, type Query } from './archive'
import { excelResponse } from '../utils/archiveFiles'
import type { PaymentRequest } from './paymentConfirmation'

const request: Pick<Request, 'get' | 'post'> = hostRequest
export type HandoverSourceType = 'PAYMENT' | 'REFUND' | 'FUND'
export type HandoverAction = 'APPROVE' | 'REJECT' | 'UNAPPROVE' | 'CANCEL'
export interface HandoverItem {
  type: HandoverSourceType
  id: string
  version: number
}
export interface HandoverCandidate extends HandoverItem {
  selectionKey?: string
  occurredAt: string
  companyName: string
  customerName: string
  amount: string
  cashAmount: string
  lineCount: number
}
export interface HandoverAttachment {
  fileId: string
  name: string
  size: number | null
}
export interface HandoverInput {
  attachments?: HandoverAttachment[]
  items: HandoverItem[]
  closingDate: string
  remark?: string
  attachmentFileId?: string
  attachmentName?: string
}
export interface HandoverLine {
  businessType?: string
  calcStartDate?: string
  calcEndDate?: string
  receiptNumbers?: string
  id?: string
  sourceType: HandoverSourceType
  sourceId: string
  originalLineId: string
  spaceId: string
  fullName: string
  customerName: string
  companyId: string
  companyName: string
  subjectName: string
  methodText: string
  bankName?: string
  occurredAt: string
  amount: string
  cashAmount: string
}
export interface HandoverPreview {
  token: string
  lines: HandoverLine[]
  amount: string
  cashAmount: string
  sourceCount: number
}
export interface HandoverRecord {
  id: string
  lineCount?: number
  occurredStart?: string
  occurredEnd?: string
  calcStartDate?: string
  calcEndDate?: string
  handoverNo?: string
  attachments?: HandoverAttachment[]
  version: number
  projectId: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED'
  closingDate: string
  submittedAt: string
  submittedBy: string
  sourceCount: number
  amount: string
  cashAmount: string
  monthClosed: boolean
  remark?: string
  attachmentFileId?: string
  attachmentName?: string
  reviewedAt?: string
  reviewedBy?: string
  reviewRemark?: string
}
export interface HandoverDetail {
  batch: HandoverRecord
  lines: HandoverLine[]
}
export interface HandoverActionInput {
  id: string
  action: HandoverAction
  version: number
  reason: string
}
export interface HandoverActionPreview {
  token: string
  batch: HandoverRecord
}
export interface HandoverLog {
  id: string
  action: string
  beforeStatus?: string
  afterStatus: string
  reason?: string
  createTime: number
  modifierName: string
}
const base = (project: string) => `/property/finance/projects/${encodeURIComponent(project)}/handovers`
const queryResponse = <T>(response: { success: boolean; result: T; message?: string }) => {
  checked(response)
  return response
}
export const queryHandoverSources = (project: string, type: HandoverSourceType, input: Query, signal?: AbortSignal) =>
  request
    .post<Page<HandoverCandidate>>(`${base(project)}/sources/${type}/_query`, input, { hiddenError: true, signal })
    .then(queryResponse)
export const queryHandovers = (project: string, input: Query, signal?: AbortSignal) =>
  request
    .post<Page<HandoverRecord>>(`${base(project)}/_query`, input, { hiddenError: true, signal })
    .then(queryResponse)
export const previewHandover = async (project: string, input: HandoverInput) =>
  checked<HandoverPreview>(await request.post(`${base(project)}/_preview`, input, { hiddenError: true }))
export const confirmHandover = async (project: string, input: PaymentRequest<HandoverInput>) =>
  checked<HandoverDetail>(await request.post(`${base(project)}/_confirm`, input, { hiddenError: true }))
export const getHandover = async (project: string, id: string) =>
  checked<HandoverDetail>(await request.get(`${base(project)}/${encodeURIComponent(id)}`, {}, { hiddenError: true }))
export const actHandover = async (project: string, input: PaymentRequest<HandoverActionInput>) =>
  checked<HandoverDetail>(
    await request.post(
      `${base(project)}/${encodeURIComponent(input.input.id)}/_${input.input.action.toLowerCase()}`,
      {
        requestId: input.requestId,
        version: input.input.version,
        reason: input.input.reason
      },
      { hiddenError: true }
    )
  )
export const queryHandoverLogs = (project: string, id: string, input: Query) =>
  request
    .post<Page<HandoverLog>>(`${base(project)}/${encodeURIComponent(id)}/logs/_query`, input, { hiddenError: true })
    .then(queryResponse)

export interface HandoverDetailQuery {
  pageIndex?: number
  pageSize?: number
  handed?: string
  spaceId?: string
  customerName?: string
  subjectName?: string
  occurredStart?: string
  occurredEnd?: string
}
export interface HandoverDetailRow {
  id: string
  type: HandoverSourceType
  sourceId: string
  version: number
  line: HandoverLine
  batchId?: string
  status?: string
  closingDate?: string
}
export const queryHandoverDetails = (project: string, input: HandoverDetailQuery, signal?: AbortSignal) =>
  request
    .post<Page<HandoverDetailRow>>(`${base(project)}/details/_query`, input, { hiddenError: true, signal })
    .then(queryResponse)
export interface HandoverBatchInput {
  items: { id: string; version: number; requestId: string }[]
  reason: string
}
export interface HandoverBatchResult {
  id: string
  success: boolean
  errorCode?: string
}
export const batchHandover = async (
  project: string,
  action: 'APPROVE' | 'UNAPPROVE',
  input: HandoverBatchInput,
  preview: boolean
) =>
  checked<HandoverBatchResult[]>(
    await request.post(`${base(project)}/batch/_${action.toLowerCase()}${preview ? '/preview' : ''}`, input, {
      hiddenError: true
    })
  )
export interface HandoverStatement {
  detail: HandoverDetail
  rows: {
    subjectName: string
    currentReceived: string
    otherReceived: string
    advanceReceived: string
    advanceRefund: string
    received: string
    refund: string
    cashAmount: string
    internalAmount: string
    amount: string
  }[]
}
export const getHandoverStatement = async (project: string, id: string) =>
  checked<HandoverStatement>(await request.get(`${base(project)}/${id}/statement`, {}, { hiddenError: true }))
export const exportHandoverStatement = (project: string, id: string, format: 'excel' | 'pdf') =>
  request
    .get<Blob>(`${base(project)}/${id}/statement/${format}`, {}, { hiddenError: true, responseType: 'blob' })
    .then(excelResponse)

export const exportHandoverDetails = (project: string, input: HandoverDetailQuery, format: 'excel' | 'pdf') =>
  request
    .post<Blob>(`${base(project)}/details/_export/${format}`, input, { hiddenError: true, responseType: 'blob' })
    .then(excelResponse)
