import type { ConditionFilterTerm } from '@jetlinks-web-core/components/ConditionFilter'

/** 报表白名单字段只接受一个 AND 条件，避免把复杂表达式静默压成不同口径。 */
export function reportConditions(terms: ConditionFilterTerm[], fields: Record<string, 'like' | 'eq'>) {
  const values: Record<string, string | undefined> = Object.fromEntries(
    Object.keys(fields).map((key) => [key, undefined])
  )
  function visit(items: ConditionFilterTerm[]) {
    for (const item of items) {
      if (item.type === 'or') throw new Error('unsupported report condition')
      if (item.terms) {
        visit(item.terms)
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
