import { reactive, watch } from 'vue'
import type { Ref } from 'vue'
import type { QueryTerm } from '../../api/archive'

export interface ReceivableFilters {
  contractCode: string
  fullName: string
  customerName: string
  subjectName: string
  periodStatus?: string
  payStatus?: string
  calcStartDate?: string
  calcEndDate?: string
}
export function receivableFilterTerms(model: ReceivableFilters): QueryTerm[] {
  const terms: QueryTerm[] = []
  for (const key of ['contractCode', 'fullName', 'customerName', 'subjectName'] as const) {
    const value = model[key]?.trim()
    if (value) terms.push({ column: key, termType: 'like', value: '%' + value + '%' })
  }
  if (model.periodStatus) terms.push({ column: 'periodStatus', termType: 'eq', value: model.periodStatus })
  if (model.calcStartDate) terms.push({ column: 'calcStartDate', termType: 'gte', value: model.calcStartDate })
  if (model.calcEndDate) terms.push({ column: 'calcEndDate', termType: 'lte', value: model.calcEndDate })
  // 显示状态由账单正式金额判断；转换为数据库条件，不能只过滤当前页造成总数错误。
  if (model.payStatus === 'PAID') terms.push({ column: 'arrears', termType: 'lte', value: '0' })
  if (model.payStatus === 'UNPAID' || model.payStatus === 'PARTIAL') {
    terms.push({ column: 'arrears', termType: 'gt', value: '0' })
    terms.push({ column: 'paidAmount', termType: model.payStatus === 'PARTIAL' ? 'gt' : 'eq', value: '0' })
  }
  return terms
}
export function useReceivableFilters(terms: Ref<QueryTerm[]>, projectId: Ref<string>) {
  const empty = (): ReceivableFilters => ({
    contractCode: '',
    fullName: '',
    customerName: '',
    subjectName: '',
    periodStatus: undefined,
    payStatus: undefined,
    calcStartDate: undefined,
    calcEndDate: undefined
  })
  const model = reactive(empty())
  function search() {
    terms.value = receivableFilterTerms(model)
  }
  function reset() {
    Object.assign(model, empty())
    search()
  }
  watch(projectId, () => {
    Object.assign(model, empty())
    terms.value = []
  })
  return { model, search, reset }
}
