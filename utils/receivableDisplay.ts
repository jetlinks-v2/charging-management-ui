import { formatFinanceTime } from './financeTime'
import type { Receivable } from '../api/financeReceivable'
import type { ReceivableColumnOption } from './receivableColumns'

export function receivableCellText(
  row: Receivable,
  column: ReceivableColumnOption,
  t: (key: string, params?: Record<string, unknown>) => string
) {
  const key = column.key
  const value = row[key as keyof Receivable]
  if (key === 'chargePeriod') return [row.periodStart, row.periodEnd].filter(Boolean).join(' 至 ') || '—'
  if (key === 'customerName') return row.customerNames?.join('、') || row.customerName || '—'
  if (key === 'accountPeriod') return row.accountPeriod || row.periodStart?.slice(0, 7) || '—'
  if (key === 'reviewState') return t('ReceivableReview.state.' + (row.reviewState || 'PENDING'))
  if (key === 'sourceType') {
    if (!value || value === 'SETTING' || value === 'AUTO' || value === 'CHARGING')
      return t('ReceivableLedger.sources.CHARGING')
    return value === 'HISTORICAL_IMPORT' ? t('ReceivableLedger.sources.HISTORICAL_IMPORT') : String(value)
  }
  if (key === 'overdueDays' && row.overdueMonths != null) {
    const days = row.overdueDays == null ? '—' : t('ReceivableLedger.days', { count: row.overdueDays })
    return t('ReceivableLedger.months', { count: row.overdueMonths }) + ' / ' + days
  }
  if (column.kind === 'boolean') return t(value === true ? 'ReceivableLedger.yes' : 'ReceivableLedger.no')
  if (value === null || value === undefined || value === '') return '—'
  if (key === 'collectionStatus') return t('ReceivableLedger.collection.' + value)
  if (column.kind === 'status') return t('ReceivableLedger.status.' + value)
  if (column.kind === 'days') return t('ReceivableLedger.days', { count: value })
  if (key === 'createTime') return formatFinanceTime(value as number)
  if (column.kind === 'price') return String(value) + ' ' + t('Split.yuan')
  return String(value)
}

export function receivableStatusColor(row: Receivable, key: string) {
  const value = row[key as keyof Receivable]
  if (key === 'reviewState') return value === 'APPROVED' ? 'success' : value === 'REJECTED' ? 'error' : 'default'
  if (key === 'periodStatus') return value === 'OPEN' ? 'success' : 'default'
  return value === 'PAID'
    ? 'success'
    : value === 'PARTIAL'
      ? 'processing'
      : value === 'OVERDUE'
        ? 'error'
        : value === 'UNPAID'
          ? 'warning'
          : 'default'
}
