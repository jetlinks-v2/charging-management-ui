import { request as hostRequest, type Request } from '@jetlinks-web/core'
import { checked, type Page } from './archive'
import { exportReportJob } from './financeReportJobs'
const request: Pick<Request, 'post'> = hostRequest
export type AnalysisKind = 'arrears' | 'monthly' | 'funds' | 'activity' | 'changes'
export type AnalysisRow = Record<string, string | number | null>
export interface AnalysisInput {
  projectIds: string[]
  spaceIds: string[]
  customerIds: string[]
  subjectIds: string[]
  startDate?: string
  endDate: string
  groupBy: string
  pageIndex: number
  pageSize: number
  customerName?: string
  fullName?: string
  subjectName?: string
  billNo?: string
  activityId?: string
  activityName?: string
  type?: string
  operation?: string
  ageBucket?: string
}
export interface AnalysisResult {
  report: AnalysisKind
  groupBy: string
  columns: { key: string; label: string; money: boolean }[]
  summary: AnalysisRow
  page: Page<AnalysisRow>
}
export const queryAnalysis = (kind: AnalysisKind, input: AnalysisInput, signal?: AbortSignal) =>
  request
    .post<AnalysisResult>(`/property/finance/reports/${kind}/_query`, input, { hiddenError: true, signal })
    .then(checked)
export const exportAnalysis = (kind: AnalysisKind, input: AnalysisInput, format: 'excel' | 'pdf') =>
  exportReportJob(kind, input, format)
