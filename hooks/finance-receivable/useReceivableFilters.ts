import { watch } from 'vue'
import type { Ref } from 'vue'
import type { ConditionFilterChangePayload } from '@jetlinks-web-core/components/ConditionFilter'
import type { QueryTerm } from '../../api/archive'

/** 保留条件组件的嵌套 AND/OR；支付状态按正式金额在分页前筛选。 */
export function receivableFilterTerms(terms: QueryTerm[]): QueryTerm[] {
  return terms.map((term) => {
    if ('terms' in term) return { ...term, terms: receivableFilterTerms(term.terms) }
    if (term.column !== 'payStatus') return term
    const unpaid: QueryTerm = { column: 'arrears', termType: 'gt', value: '0' }
    const states: Record<string, QueryTerm[]> = {
      PAID: [{ column: 'arrears', termType: 'lte', value: '0' }],
      PARTIAL: [unpaid, { column: 'paidAmount', termType: 'gt', value: '0' }],
      UNPAID: [unpaid, { column: 'paidAmount', termType: 'eq', value: '0' }]
    }
    if (term.termType !== 'eq' || !states[String(term.value)]) throw new Error('Invalid payment state filter')
    return { type: term.type, terms: states[String(term.value)] }
  })
}
export function useReceivableFilters(terms: Ref<QueryTerm[]>, projectId: Ref<string>) {
  function filter({ filter }: ConditionFilterChangePayload) {
    terms.value = receivableFilterTerms((filter.terms || []) as QueryTerm[])
  }
  watch(projectId, () => {
    terms.value = []
  })
  return { filter }
}
