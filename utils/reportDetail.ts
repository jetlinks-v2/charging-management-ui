import type { ReportRow } from '../api/financeReport'
import type { ReceivedRow } from '../api/financeReceivedReport'
import { formatFinanceTime } from './financeTime'
import { collectionTypeColors, handoverStateColors } from './collectionDisplay'

interface DetailField {
  key: string
  text: string
  color?: string
  span?: number
}
type Translate = (key: string) => string

/** 表格插槽会附带 index、column 等元数据，详情只读取业务契约内的字段。 */
export function reportDetail(row: ReportRow | ReceivedRow, namespace: 'Report' | 'Received', t: Translate) {
  const received = namespace === 'Received'
  const source = row as unknown as Record<string, unknown>
  const fields = received
    ? [
        'sourceNo',
        'projectName',
        'customerName',
        'fullName',
        'subjectName',
        'sourceType',
        'methodText',
        'collectorName',
        'handoverState',
        'receivedAt',
        'calcStartDate',
        'calcEndDate',
        'remark'
      ]
    : [
        'billNo',
        'projectName',
        'customerName',
        'fullName',
        'subjectName',
        'collectionStatus',
        'receivableDate',
        'dueDate',
        'calcStartDate',
        'calcEndDate',
        'overdueDays',
        'calculatedAsOfDate',
        'remark'
      ]
  const dates = new Set([
    'receivedAt',
    'receivableDate',
    'dueDate',
    'calcStartDate',
    'calcEndDate',
    'calculatedAsOfDate'
  ])
  const basic: DetailField[] = fields.flatMap((key) => {
    const value = source[key]
    if (['remark', 'calculatedAsOfDate'].includes(key) && !value) return []
    let text = value === null || value === undefined || value === '' ? '—' : String(value)
    let color: string | undefined
    if (dates.has(key)) text = formatFinanceTime(value as string | undefined)
    if (['sourceType', 'handoverState', 'collectionStatus'].includes(key)) {
      const code = typeof value === 'string' ? value : ''
      const label = `${namespace}.${code}`
      text = code && t(label) !== label ? t(label) : '—'
      color =
        key === 'sourceType'
          ? collectionTypeColors[code]
          : key === 'handoverState'
          ? handoverStateColors[code]
          : code === 'PAID'
          ? 'green'
          : code === 'PARTIAL'
          ? 'orange'
          : 'default'
    }
    return [{ key, text, color, span: ['fullName', 'remark'].includes(key) ? 2 : 1 }]
  })
  const amountKeys = received
    ? ['incomeAmount', 'refundAmount', 'netAmount', 'currentPeriodAmount', 'otherPeriodAmount']
    : [
        'receivableAmount',
        'remissionAmount',
        'netAmount',
        'receivedAmount',
        'unreceivedAmount',
        'overdueAmount',
        'collectionRate'
      ]
  const amounts = row.amounts as unknown as Record<string, unknown>
  const money: DetailField[] = amountKeys.flatMap((key) => {
    const value = amounts[key]
    if (value === null || value === undefined) return []
    return [{ key, text: `${value}${key === 'collectionRate' ? '%' : ` ${t('Report.currency')}`}` }]
  })
  return { basic, money }
}
