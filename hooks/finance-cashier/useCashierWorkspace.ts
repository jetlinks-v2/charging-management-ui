import { computed, onScopeDispose, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { onlyMessage } from '@jetlinks-web/utils'
import { useFinanceSpaceScope, flattenSpaces } from '../finance-setting/useFinanceSpaceScope'
import { queryCashierBills } from '../../api/financeCashier'
import { queryFunds, type FundAccount } from '../../api/financeFunds'
import { getReceivable, changeReceivable, type Receivable } from '../../api/financeReceivable'
import type { Query, Page } from '../../api/archive'
import {
  buildCashierTree,
  collectible,
  cents,
  money,
  cashierReductions,
  type CashierReduction
} from '../../utils/cashierTree'
import { requestErrorMessage } from '../../utils/requestError'

export function useCashierWorkspace() {
  const { t } = useI18n()
  const archive = useFinanceSpaceScope()
  const house = ref(''),
    appliedHouse = ref('')
  const tab = ref('collect'),
    customer = ref(''),
    appliedCustomer = ref('')
  const rows = ref<Receivable[]>([]),
    accounts = ref<FundAccount[]>([])
  const loading = ref(false),
    failed = ref(false),
    balanceFailed = ref(false)
  const checked = ref<string[]>([]),
    reduction = ref<CashierReduction>()
  const open = ref(false),
    detail = ref<Receivable>(),
    detailLoading = ref(false),
    detailFailed = ref(false)
  let generation = 0,
    detailGeneration = 0,
    disposed = false
  const notify = (error: unknown) => onlyMessage(requestErrorMessage(error, t('Finance.failed')), 'error')
  const projectId = archive.projectId
  const selected = computed(() => rows.value.filter((row) => checked.value.includes(row.id) && collectible(row)))
  const billTree = computed(() => buildCashierTree(rows.value))
  interface SpaceNode {
    key: string
    title: string
    children: SpaceNode[]
  }
  const tree = computed(() => {
    const map = (nodes: typeof archive.tree.value): SpaceNode[] =>
      nodes.map((node) => ({
        key: node.id,
        title: node.name,
        children: map(node.children || [])
      }))
    return map(archive.visibleTree.value)
  })
  const hasScope = computed(() => !!archive.selected.value || !!appliedHouse.value || !!appliedCustomer.value)
  const total = computed(() => money(selected.value.reduce((sum, row) => sum + cents(row.arrears), 0n)))
  const discount = computed(() => {
    try {
      return money(cashierReductions(selected.value, reduction.value).reduce((sum, value) => sum + cents(value), 0n))
    } catch {
      return ''
    }
  })
  const actual = computed(() => (discount.value ? money(cents(total.value) - cents(discount.value)) : ''))
  const balances = computed(() => ({
    advance: money(
      accounts.value.filter((row) => row.type === 'ADVANCE').reduce((sum, row) => sum + cents(row.balance), 0n)
    ),
    deposit: money(
      accounts.value.filter((row) => row.type === 'DEPOSIT').reduce((sum, row) => sum + cents(row.balance), 0n)
    )
  }))
  const scopeLabel = computed(
    () =>
      appliedHouse.value ||
      archive.selected.value?.fullName ||
      archive.selected.value?.spaceLocation ||
      archive.selected.value?.name ||
      appliedCustomer.value
  )
  function clear() {
    checked.value = []
    reduction.value = undefined
  }
  function check(keys: (string | number)[] | { checked: (string | number)[] }) {
    const values = new Set((Array.isArray(keys) ? keys : keys.checked).map(String))
    checked.value = rows.value.filter((row) => values.has(row.id) && collectible(row)).map((row) => row.id)
    reduction.value = undefined
  }
  // 只在全部分页完整且身份唯一时发布数据，异常绝不展示成“部分欠费”。
  async function readAll<T extends { id: string }>(
    request: (page: number) => Promise<Page<T>>,
    token: number
  ): Promise<T[]> {
    const first = await request(0)
    if (first.total > 10000 || first.total < 0) throw new Error(t('CashierDesk.tooMany'))
    const output = [...first.data]
    for (let page = 1; output.length < first.total && page < 50; page++) {
      if (token !== generation || disposed) return []
      const next = await request(page)
      if (next.total !== first.total || !next.data.length) throw new Error(t('CashierDesk.changed'))
      output.push(...next.data)
    }
    if (output.length !== first.total || new Set(output.map((row) => row.id)).size !== output.length)
      throw new Error(t('CashierDesk.changed'))
    return output
  }
  async function reload() {
    const token = ++generation,
      project = projectId.value,
      space = archive.selected.value
    clear()
    rows.value = []
    accounts.value = []
    failed.value = false
    balanceFailed.value = false
    loading.value = !!project && hasScope.value
    if (!loading.value) return
    const terms: Query['terms'] = []
    if (space) terms.push({ column: 'spaceId', termType: 'in', value: flattenSpaces([space]).map((node) => node.id) })
    if (appliedHouse.value) terms.push({ column: 'fullName', termType: 'like', value: `%${appliedHouse.value}%` })
    const customerName = appliedCustomer.value
    // 多收费对象是快照数组，完整读取后匹配展示姓名，不能查询不存在的 customerNames 数据库字段。
    const bills = readAll(
      async (pageIndex) =>
        (
          await queryCashierBills(project, {
            terms,
            pageIndex,
            pageSize: 200,
            sorts: [
              { name: 'calcStartDate', order: 'asc' },
              { name: 'id', order: 'asc' }
            ]
          })
        ).result,
      token
    )
      .then((result) => {
        if (!disposed && token === generation)
          rows.value = customerName
            ? result.filter((row) =>
                [...(row.customerNames || []), row.customerName].some((name) => name?.includes(customerName))
              )
            : result
      })
      .catch((error) => {
        if (!disposed && token === generation) {
          failed.value = true
          notify(error)
        }
      })
    const funds = space?.customerBound
      ? readAll(
          async (pageIndex) =>
            (
              await queryFunds(project, {
                terms: [{ column: 'spaceId', termType: 'eq', value: space.id }],
                pageIndex,
                pageSize: 200,
                sorts: [{ name: 'id', order: 'asc' }]
              })
            ).result,
          token
        )
          .then((result) => {
            if (!disposed && token === generation) accounts.value = result
          })
          .catch((error) => {
            if (!disposed && token === generation) {
              balanceFailed.value = true
              notify(error)
            }
          })
      : Promise.resolve()
    await Promise.allSettled([bills, funds])
    if (!disposed && token === generation) loading.value = false
  }
  function search() {
    const fullName = house.value.trim(),
      customerName = customer.value.trim()
    // 手输路径改变后解除旧树节点限制，否则会拿上一套房屋的范围过滤新地址。
    if (archive.selected.value && fullName !== archive.selected.value.fullName) archive.selectedId.value = undefined
    house.value = fullName
    customer.value = customerName
    appliedHouse.value = fullName
    appliedCustomer.value = customerName
    void reload()
  }
  function chooseHouse(value?: string) {
    customer.value = ''
    appliedCustomer.value = ''
    archive.selectedId.value = value
  }
  async function select(row: Pick<Receivable, 'id'>) {
    const token = ++detailGeneration
    open.value = true
    detail.value = undefined
    detailLoading.value = true
    detailFailed.value = false
    try {
      const result = await getReceivable(projectId.value, row.id)
      if (!disposed && token === detailGeneration) detail.value = result
    } catch (error) {
      if (token === detailGeneration) {
        detailFailed.value = true
        notify(error)
      }
    } finally {
      if (token === detailGeneration) detailLoading.value = false
    }
  }
  function close() {
    ++detailGeneration
    open.value = false
    detail.value = undefined
  }
  async function freeze(row: Receivable) {
    try {
      await changeReceivable(projectId.value, row, 'FREEZE', t('CashierDesk.freezeReason'))
      await reload()
    } catch (error) {
      notify(error)
    }
  }
  watch(
    [projectId, archive.selectedId],
    () => {
      close()
      house.value = archive.selected.value?.fullName || ''
      appliedHouse.value = ''
      customer.value = ''
      appliedCustomer.value = ''
      void reload()
    },
    { flush: 'sync' }
  )
  onScopeDispose(() => {
    disposed = true
    ++generation
    ++detailGeneration
  })
  return {
    archive,
    tree,
    house,
    appliedHouse,
    tab,
    customer,
    appliedCustomer,
    rows,
    selected,
    checked,
    billTree,
    total,
    discount,
    actual,
    balances,
    balanceFailed,
    reduction,
    loading,
    failed,
    hasScope,
    scopeLabel,
    chooseHouse,
    search,
    reload,
    check,
    clear,
    select,
    freeze,
    open,
    detail,
    detailLoading,
    detailFailed,
    close,
    notify
  }
}
