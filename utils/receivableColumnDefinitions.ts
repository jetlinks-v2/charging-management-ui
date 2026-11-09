import type { ReceivableColumnOption } from './receivableColumns'

/** 与旧应收台账保持字段顺序；金额列及其本页合计共用这一份定义。 */
export const receivableMoneyKeys = [
  'contractReceivableAmount',
  'accruedReceivableAmount',
  'actualReceivableAmount',
  'incomeExcludingTax',
  'outputTaxAmount',
  'adjustmentAmount',
  'assessmentAmount',
  'temporaryDispatchAmount',
  'arrears',
  'paidAmount',
  'accruedLateFeeAmount',
  'lateFeeReductionAmount',
  'finalLateFeeAmount',
  'feeReductionAmount'
] as const
export type ReceivableMoneyKey = (typeof receivableMoneyKeys)[number]
export function receivableColumnOptions(t: (key: string) => string): ReceivableColumnOption[] {
  const column = (
    key: string,
    group: ReceivableColumnOption['group'],
    width = 120,
    kind: ReceivableColumnOption['kind'] = 'text',
    locked = false
  ): ReceivableColumnOption => ({ key, title: t('ReceivableLedger.' + key), group, width, kind, locked })
  return [
    column('rowNumber', 'identity', 90, 'text', true),
    column('billNo', 'identity', 280, 'text', true),
    column('chargePeriod', 'identity', 215, 'period'),
    column('projectName', 'identity', 150),
    column('fullName', 'identity', 240),
    column('customerName', 'identity', 150),
    column('subjectName', 'identity', 140),
    column('standardName', 'identity', 160),
    column('calcStartDate', 'billing', 130, 'date'),
    column('calcEndDate', 'billing', 130, 'date'),
    ...receivableMoneyKeys.slice(0, 10).map((key) => column(key, 'amount', 140, 'money')),
    column('paidDate', 'payment', 140, 'date'),
    column('collectionDays', 'payment', 115, 'days'),
    column('overdueDays', 'payment', 145, 'days'),
    column('periodStatus', 'payment', 110, 'status'),
    column('collectionStatus', 'payment', 115, 'status'),
    column('payStatus', 'payment', 115, 'status'),
    column('price', 'billing', 115, 'price'),
    column('usageValue', 'billing', 120),
    ...receivableMoneyKeys.slice(10).map((key) => column(key, 'amount', 140, 'money')),
    column('accountPeriod', 'billing'),
    column('dueDate', 'billing', 130, 'date'),
    column('split', 'record', 100, 'boolean'),
    column('deletedFlag', 'record', 100, 'boolean'),
    column('chargeLocked', 'record', 100, 'boolean'),
    column('frozen', 'record', 100, 'boolean'),
    column('sourceType', 'record', 130),
    column('taskName', 'record', 150),
    column('createTime', 'record', 180, 'date'),
    column('remark', 'record', 200),
    column('reviewState', 'record', 115, 'status'),
    column('calculatedAsOfDate', 'record', 130, 'date'),
    column('actions', 'record', 100, 'text', true)
  ]
}
