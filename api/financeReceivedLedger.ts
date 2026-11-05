import { request as hostRequest, type Request } from '@jetlinks-web/core'
import { checked } from './archive'
import { excelResponse } from '../utils/archiveFiles'
import type { ReceivedInput, ReceivedReport } from './financeReceivedReport'
const request: Pick<Request, 'post'> = hostRequest
const base = (project: string) => `/property/finance/projects/${encodeURIComponent(project)}/received`
export const queryReceivedLedger = (project: string, input: ReceivedInput, signal?: AbortSignal) =>
  request.post<ReceivedReport>(`${base(project)}/_query`, input, { hiddenError: true, signal }).then(checked)
export const exportReceivedLedger = (project: string, input: ReceivedInput) =>
  request.post<Blob>(`${base(project)}/_export`, input, { hiddenError: true, responseType: 'blob' }).then(excelResponse)
