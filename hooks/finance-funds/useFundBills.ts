import { ref, computed, onMounted, onScopeDispose } from 'vue'
import { queryFundBills, type FundAccount } from '../../api/financeFunds'
import type { Receivable } from '../../api/financeReceivable'
import { sumMoney } from '../../utils/receivableTotals'
import { requestErrorMessage } from '../../utils/requestError'
import { onlyMessage } from '@jetlinks-web/utils'
import { useI18n } from 'vue-i18n'
export function useFundBills(
  props: { projectId: string; account: FundAccount },
  update: (items: { id: string; version: number; amount: string }[], total: string) => void
) {
  const { t } = useI18n()
  const rows = ref<Receivable[]>([]),
    total = ref(0),
    page = ref(1),
    loading = ref(false),
    selected = ref<string[]>([]),
    amounts = ref<Record<string, string>>({})
  let generation = 0
  async function load(current = 1) {
    const n = ++generation
    page.value = current
    loading.value = true
    selected.value = []
    rows.value = []
    amounts.value = {}
    update([], '0.00')
    try {
      const v = await queryFundBills(props.projectId, props.account.id, {
        terms: [],
        pageIndex: current - 1,
        pageSize: 8,
        sorts: [{ name: 'calcStartDate', order: 'asc' }]
      })
      if (n === generation) {
        rows.value = v.data
        total.value = v.total
        amounts.value = Object.fromEntries(v.data.map((r) => [r.id, r.arrears]))
      }
    } catch (e) {
      if (n === generation) onlyMessage(requestErrorMessage(e, t('Finance.failed')), 'error')
    } finally {
      if (n === generation) loading.value = false
    }
  }
  const selection = computed(() => ({
    selectedRowKeys: selected.value,
    onChange: (keys: (string | number)[]) => {
      selected.value = keys.map(String)
      changed()
    },
    getCheckboxProps: (r: Receivable) => ({
      disabled: r.customerIds?.length
        ? !r.customerIds.includes(props.account.customerId)
        : r.customerId !== props.account.customerId
    })
  }))
  function changed() {
    const items = rows.value
      .filter((v) => selected.value.includes(v.id))
      .map((v) => ({ id: v.id, version: v.version, amount: amounts.value[v.id] }))
    try {
      update(items, sumMoney(items.map((v) => v.amount)))
    } catch {
      update([], '0.00')
    }
  }
  onMounted(() => void load())
  onScopeDispose(() => ++generation)
  return { rows, total, page, loading, selection, amounts, changed, load }
}
