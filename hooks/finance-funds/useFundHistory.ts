import { computed, ref } from 'vue'
import { queryFundEntries, type FundAccount } from '../../api/financeFunds'
import type { Query } from '../../api/archive'

export function useFundHistory(props: { projectId: string; account: FundAccount }) {
  const selected = ref<import('../../api/financeFunds').FundEntry>()
  const params = computed(() => ({ accountId: props.account.id, sorts: [{ name: 'createTime', order: 'desc' }] }))
  const request = (q: Query, config?: { signal: AbortSignal }) =>
    queryFundEntries(props.projectId, props.account.id, q, config?.signal)
  return { selected, params, request }
}
