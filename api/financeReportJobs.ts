import { request as hostRequest, type Request } from '@jetlinks-web/core'
import { checked } from './archive'
import { excelResponse } from '../utils/archiveFiles'
const request: Pick<Request, 'post' | 'get'> = hostRequest
interface ExportTask {
  id: string
  state: 'QUEUED' | 'RUNNING' | 'DONE' | 'FAILED'
  errorMessage?: string
}
/** 后台文件逐页生成；轮询有截止时间，失败和超时明确提示，不接受半个文件。 */
export async function exportReportJob(kind: string, input: unknown, format: 'excel' | 'pdf'): Promise<Blob> {
  const base = `/property/finance/reports/${kind}/_exports`
  const task = await request.post<ExportTask>(`${base}/${format}`, input, { hiddenError: true }).then(checked)
  const deadline = Date.now() + 15 * 60 * 1000
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 1200))
    const status = await request.get<ExportTask>(`${base}/${task.id}`, {}, { hiddenError: true }).then(checked)
    if (status.state === 'FAILED') throw new Error(status.errorMessage || '报表生成失败，请重试')
    if (status.state === 'DONE')
      return request
        .get<Blob>(`${base}/${task.id}/_download`, {}, { hiddenError: true, responseType: 'blob' })
        .then(excelResponse)
  }
  throw new Error('报表仍在后台生成，请稍后重试查询')
}
