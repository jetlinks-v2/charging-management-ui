import { request as hostRequest, type Request } from '@jetlinks-web/core'
import { checked } from './archive'
import type { ReportAmounts } from './financeReport'
import type { ReceivedAmounts } from './financeReceivedReport'
const request: Pick<Request, 'post'> = hostRequest

export interface OverviewInput {
  projectIds: string[]
  startDate: string
  endDate: string
}
export interface OverviewResult {
  asOfDate: string
  houses: {
    houseCount: number
    incompleteCount: number
    buildingArea: string
    billingArea: string
    states: { value?: string; text: string; count: number }[]
  }
  receivables: {
    summary: ReportAmounts
    subjects: { subjectId: string; subjectName: string; amounts: ReportAmounts }[]
    ageBuckets: { key: string; amount: string }[]
    overdueHouseCount: number
    billingHouseCount: number
    owingHouseCount: number
  }
  cash: {
    summary: ReceivedAmounts
    grain: 'DAY' | 'MONTH'
    trend: { period: string; incomeAmount: string; refundAmount: string; netAmount: string }[]
  }
  balances: {
    advanceAmount: string
    depositAmount: string
    items: { type: 'ADVANCE' | 'DEPOSIT'; subjectId: string; subjectName: string; amount: string }[]
  }
  handover: ReceivedAmounts
}
export const queryOverview = (input: OverviewInput, signal?: AbortSignal) =>
  request.post<OverviewResult>('/property/finance/overview/_query', input, { hiddenError: true, signal }).then(checked)
