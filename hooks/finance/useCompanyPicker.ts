import { computed, ref, watch, type Ref } from 'vue'
import { queryProjectCompanyCandidates, type Company } from '../../api/finance'
import type { Query } from '../../api/archive'
export function useCompanyPicker(open: Ref<boolean>, projectId: () => string) {
  const keyword = ref('')
  const search = ref('')
  const selected = ref<Company>()
  watch(open, (value) => {
    if (value) {
      keyword.value = ''
      search.value = ''
      selected.value = undefined
    }
  })
  const params = computed<Query>(() => ({
    terms: search.value.trim()
      ? [
          {
            terms: [
              { column: 'companyName', termType: 'like', value: `%${search.value.trim()}%` },
              { column: 'taxNumber', termType: 'like', value: `%${search.value.trim()}%`, type: 'or' }
            ]
          }
        ]
      : []
  }))
  return {
    keyword,
    search,
    selected,
    params,
    request: (query: Query) => queryProjectCompanyCandidates(projectId(), query),
    rowSelection: computed(() => ({
      type: 'radio',
      selectedRowKeys: selected.value ? [selected.value.id] : [],
      onChange: (_keys: string[], rows: Company[]) => {
        selected.value = rows[0]
      }
    }))
  }
}
