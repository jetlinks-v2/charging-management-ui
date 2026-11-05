import { computed, ref, watch, onScopeDispose } from 'vue'
import type { useCashierWorkspace } from './useCashierWorkspace'
import { flattenSpaces } from '../finance-setting/useFinanceSpaceScope'
import { getPayment, queryPayments, type PaymentDetail } from '../../api/financeCashier'
import type { Query } from '../../api/archive'

export function useCashierRecords(workspace: ReturnType<typeof useCashierWorkspace>) {
  const table = ref<{ reload: () => void }>()
  const record = ref<PaymentDetail>(),
    loading = ref(false),
    open = ref(false)
  let generation = 0
  const params = computed(() => {
    const terms: Query['terms'] = []
    const space = workspace.archive.selected.value
    if (space) terms.push({ column: 'spaceId', termType: 'in', value: flattenSpaces([space]).map((node) => node.id) })
    if (workspace.appliedHouse.value)
      terms.push({ column: 'fullName', termType: 'like', value: `%${workspace.appliedHouse.value}%` })
    if (workspace.appliedCustomer.value)
      terms.push({ column: 'customerName', termType: 'like', value: `%${workspace.appliedCustomer.value}%` })
    return { projectId: workspace.archive.projectId.value, terms, sorts: [{ name: 'createTime', order: 'desc' }] }
  })
  const request = (query: Query) => queryPayments(workspace.archive.projectId.value, query)
  async function select(id: string) {
    const token = ++generation
    open.value = true
    loading.value = true
    record.value = undefined
    try {
      const result = await getPayment(workspace.archive.projectId.value, id)
      if (token === generation) record.value = result
    } catch (error) {
      if (token === generation) workspace.notify(error)
    } finally {
      if (token === generation) loading.value = false
    }
  }
  function close() {
    ++generation
    open.value = false
    record.value = undefined
  }
  watch(() => workspace.archive.projectId.value, close, { flush: 'sync' })
  onScopeDispose(close)
  return { table, params, request, record, open, loading, select, close }
}
