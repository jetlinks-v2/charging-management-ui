import type { ConditionFilterTerm } from '@jetlinks-web-core/components/ConditionFilter'
import dayjs from 'dayjs'

export type ReportDateRanges = Record<string, readonly [string, string]>

/** 报表白名单字段只接受一个 AND 条件，避免把复杂表达式静默压成不同口径。 */
export function reportConditions(
  terms: ConditionFilterTerm[],
  fields: Record<string, 'like' | 'eq'>,
  dateRanges: ReportDateRanges = {}
) {
  const values: Record<string, string | undefined> = Object.fromEntries(
    [...Object.keys(fields), ...Object.values(dateRanges).flat()].map((key) => [key, undefined])
  )
  const seen = new Set<string>()
  function visit(items: ConditionFilterTerm[]) {
    for (const item of items) {
      if (item.type === 'or') throw new Error('unsupported report condition')
      if (item.terms) {
        visit(item.terms)
        continue
      }
      if (item.column && dateRanges[item.column]) {
        if (seen.has(item.column) || item.termType !== 'btw' || !Array.isArray(item.value) || item.value.length !== 2)
          throw new Error('unsupported report date range')
        // 通用日期编辑器提交时间戳，报表接口按本地自然日查询；区间清除时两端一并清除。
        const dates = item.value.map((value: unknown) => {
          if ((typeof value !== 'number' && typeof value !== 'string') || !dayjs(value).isValid())
            throw new Error('invalid report date')
          const date = dayjs(value).format('YYYY-MM-DD')
          if (typeof value === 'string' && value !== date) throw new Error('invalid report date')
          return date
        })
        if (dates[0] > dates[1]) throw new Error('reversed report date range')
        const [start, end] = dateRanges[item.column]
        values[start] = dates[0]
        values[end] = dates[1]
        seen.add(item.column)
        continue
      }
      if (
        !item.column ||
        !fields[item.column] ||
        item.termType !== fields[item.column] ||
        values[item.column] !== undefined ||
        typeof item.value !== 'string'
      )
        throw new Error('unsupported report condition')
      values[item.column] = item.value
    }
  }
  visit(terms)
  return values
}
