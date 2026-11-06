import dayjs from 'dayjs'

/** 只统一展示精度；接口原始时间保留，业务日期不补零点时间。 */
export function formatFinanceTime(value?: string | number | null): string {
  if (value === null || value === undefined || value === '') return '—'
  const date = dayjs(value)
  if (!date.isValid()) return '—'
  return date.format(typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? 'YYYY-MM-DD' : 'YYYY-MM-DD HH:mm')
}
