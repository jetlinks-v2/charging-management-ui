import { computed, ref, watch, type Ref } from 'vue'
import { queryStandardTaxes } from '../../api/financeStandard'
import type { TaxItem } from '../../api/financeTax'
import type { Query } from '../../api/archive'
/** 真实分页查询，不截取前200条；选中值独立保留，翻页不会丢失选择。 */
export function useStandardTaxPicker(open: Ref<boolean>, project: () => string) {
  const keyword = ref(''),
    search = ref(''),
    selected = ref<TaxItem>()
  watch(open, (value) => {
    if (value) {
      keyword.value = ''
      search.value = ''
      selected.value = undefined
    }
  })
  const params = computed(() => ({
    terms: search.value.trim()
      ? [{ terms: [{ column: 'goodsName', termType: 'like', value: `%${search.value.trim()}%` }] }]
      : []
  }))
  const selection = computed(() => ({
    type: 'radio',
    selectedRowKeys: selected.value ? [selected.value.id] : [],
    onChange: (_keys: string[], rows: TaxItem[]) => {
      selected.value = rows[0]
    }
  }))
  return {
    keyword,
    search,
    selected,
    params,
    selection,
    request: (query: Query, config?: { signal: AbortSignal }) => queryStandardTaxes(project(), query, config?.signal)
  }
}
