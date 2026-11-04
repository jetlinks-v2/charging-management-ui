import dayjs from 'dayjs'
import type { ConditionFieldSchema } from '@jetlinks-web-core/components/ConditionFilter'

/** 通用日期编辑器输出时间戳，账务业务日期按本地日历转为ISO日期，避免以毫秒查询字符串列。 */
export function receivableDateValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(receivableDateValue)
  if (value === null || value === undefined || value === '') return value
  const date = dayjs(value as string | number)
  if (!date.isValid()) throw new Error('Invalid business date')
  return date.format('YYYY-MM-DD')
}

export function receivableFields(t: (key: string) => string): ConditionFieldSchema[] {
  return [
    ...['contractCode', 'fullName', 'subjectName', 'customerName', 'standardName'].map((key) => ({
      title: t('Receivable.' + key),
      dataIndex: key,
      search: { type: 'string' }
    })),
    ...['calcStartDate', 'calcEndDate', 'dueDate'].map((key) => ({
      title: t('Receivable.' + key),
      dataIndex: key,
      search: {
        type: 'date',
        componentProps: { showTime: false, format: 'YYYY-MM-DD' },
        handleValue: receivableDateValue
      }
    }))
  ]
}
