import type { CollectionImportKind } from '../api/financeCollectionImport'
export interface ImportField {
  key: string
  label: string
  type?: 'date' | 'month' | 'datetime' | 'money' | 'number'
  optional?: boolean
  readonly?: boolean
}
export const historicalImportFields: ImportField[] = [
  ...['fullName', 'customerName', 'subjectName', 'standardName', 'contractCode'].map((key) => ({
    key,
    label: 'ReceivableLedger.' + key,
    optional: key === 'contractCode'
  })),
  ...['calcStartDate', 'calcEndDate', 'dueDate'].map((key) => ({
    key,
    label: 'ReceivableLedger.' + key,
    type: 'date' as const
  })),
  { key: 'accountPeriod', label: 'ReceivableLedger.accountPeriod', type: 'month' },
  ...['contractReceivableAmount', 'feeReductionAmount', 'actualReceivableAmount'].map((key) => ({
    key,
    label: 'ReceivableLedger.' + key,
    type: 'money' as const
  })),
  { key: 'remark', label: 'ReceivableLedger.remark', optional: true }
]
/** 引用名称由服务器按当前项目唯一解析；收款来源单号不可在暂存后改变。 */
export function collectionImportFields(kind: CollectionImportKind): ImportField[] {
  const keys = [
    'externalNo',
    'fullName',
    'customerName',
    'subjectName',
    'standardName',
    'companyName',
    'methodText',
    'bankName',
    'payerName',
    'amount',
    'paidAt',
    'startDate',
    'endDate',
    'accountPeriod',
    ...(kind !== 'RECEIVED' ? ['quantity'] : []),
    'remark',
    ...(kind === 'RECEIVED' ? ['reductionAmount', 'reductionReason'] : [])
  ]
  return keys.map((key) => ({
    key,
    label: 'CollectionImport.fields.' + key,
    optional:
      ['bankName', 'remark', 'reductionAmount', 'reductionReason', 'quantity'].includes(key) ||
      (kind === 'DEPOSIT' && ['standardName', 'startDate', 'endDate', 'accountPeriod'].includes(key)) ||
      (kind === 'ADVANCE' && key === 'accountPeriod') ||
      (kind === 'RECEIVED' &&
        ['fullName', 'customerName', 'subjectName', 'standardName', 'startDate', 'endDate', 'accountPeriod'].includes(
          key
        )),
    readonly:
      key === 'externalNo' ||
      (kind === 'RECEIVED' &&
        [
          'receivableId',
          'fullName',
          'customerName',
          'subjectName',
          'standardName',
          'startDate',
          'endDate',
          'accountPeriod'
        ].includes(key)),
    type: ['amount', 'reductionAmount'].includes(key)
      ? 'money'
      : key === 'quantity'
      ? 'number'
      : key === 'paidAt'
      ? 'datetime'
      : key === 'accountPeriod'
      ? 'month'
      : ['startDate', 'endDate'].includes(key)
      ? 'date'
      : undefined
  }))
}
