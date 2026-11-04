import { computed, onScopeDispose, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { onlyMessage, downloadFileByUrl } from '@jetlinks-web/utils'
import type { Query } from '../../api/archive'
import {
  getReceivable,
  queryReceivables,
  changeReceivable,
  exportReceivables,
  type Receivable,
  type ReceivableAction
} from '../../api/financeReceivable'
import { useArchiveScope, flattenSpaces } from '../archive/useArchiveScope'
import { useProjectSwitchGuard } from '../project/useProjectContext'
import { requestErrorMessage } from '../../utils/requestError'
import { excelErrorMessage } from '../../utils/archiveFiles'

export const receivablePermission = 'charging/FinanceReceivable'
export function useReceivableWorkspace() {
  const { t } = useI18n()
  const archive = useArchiveScope()
  const table = ref<{ reload: () => void }>()
  const terms = ref<Query['terms']>([])
  const status = ref('ALL')
  const open = ref(false),
    loading = ref(false),
    failed = ref(false),
    saving = ref(false),
    exporting = ref(false)
  const detail = ref<Receivable>()
  const adjusting = ref(false)
  const actionTarget = ref<{ row: Receivable; action: ReceivableAction }>()
  let detailToken = 0,
    disposed = false
  const notify = (error: unknown) => onlyMessage(requestErrorMessage(error, t('Finance.failed')), 'error')
  const reload = () => table.value?.reload()
  const tree = computed(() => {
    type Node = { key: string; title: string; children: Node[] }
    const map = (rows: typeof archive.tree.value): Node[] =>
      rows.map((row) => ({
        key: row.id,
        title: row.spaceTypeName ? `${row.name} · ${row.spaceTypeName}` : row.name,
        children: map(row.children || [])
      }))
    return map(archive.visibleTree.value)
  })
  const params = computed(() => {
    const nodes = archive.selected.value ? flattenSpaces([archive.selected.value]).map((row) => row.id) : []
    const scope: NonNullable<Query['terms']> = nodes.length ? [{ column: 'spaceId', termType: 'in', value: nodes }] : []
    if (status.value === 'FROZEN') scope.push({ column: 'frozen', termType: 'eq', value: true })
    else if (status.value !== 'ALL') scope.push({ column: 'periodStatus', termType: 'eq', value: status.value })
    return {
      terms: [...(terms.value || []), ...scope],
      projectId: archive.projectId.value,
      sorts: [{ name: 'createTime', order: 'desc' }]
    }
  })
  async function request(query: Query, config?: { signal: AbortSignal }) {
    if (!archive.projectId.value) return { success: true, result: { data: [], total: 0, pageIndex: 0, pageSize: 12 } }
    return queryReceivables(archive.projectId.value, query, config?.signal)
  }
  async function select(row: Receivable, forAdjustment = false) {
    const project = archive.projectId.value,
      token = ++detailToken
    if (!project) return
    open.value = true
    adjusting.value = forAdjustment
    loading.value = true
    failed.value = false
    detail.value = undefined
    try {
      const result = await getReceivable(project, row.id)
      if (!disposed && token === detailToken) detail.value = result
    } catch (error) {
      if (token === detailToken) {
        failed.value = true
        notify(error)
      }
    } finally {
      if (token === detailToken) loading.value = false
    }
  }
  function close() {
    ++detailToken
    open.value = false
    adjusting.value = false
    detail.value = undefined
  }
  async function change(reason: string) {
    const target = actionTarget.value,
      project = archive.projectId.value
    if (!target || saving.value || !project) return
    saving.value = true
    try {
      await changeReceivable(project, target.row, target.action, reason)
      onlyMessage(t('Receivable.changed'), 'success')
      actionTarget.value = undefined
      reload()
    } catch (error) {
      notify(error)
    } finally {
      saving.value = false
    }
  }
  async function exportRows() {
    const project = archive.projectId.value
    if (!project || exporting.value) return
    exporting.value = true
    try {
      const file = await exportReceivables(project, params.value)
      const url = URL.createObjectURL(file)
      try {
        downloadFileByUrl(url, t('Receivable.title'), 'xlsx')
      } finally {
        setTimeout(() => URL.revokeObjectURL(url), 1000)
      }
    } catch (error) {
      onlyMessage(await excelErrorMessage(error, t('Finance.failed')), 'error')
    } finally {
      exporting.value = false
    }
  }
  useProjectSwitchGuard(() => !open.value && !actionTarget.value && !saving.value && !exporting.value)
  watch(archive.projectId, () => {
    close()
    actionTarget.value = undefined
    status.value = 'ALL'
  })
  onScopeDispose(() => {
    disposed = true
    ++detailToken
  })
  return {
    archive,
    tree,
    table,
    terms,
    params,
    status,
    request,
    open,
    loading,
    failed,
    detail,
    adjusting,
    actionTarget,
    saving,
    exporting,
    select,
    close,
    change,
    reload,
    notify,
    exportRows
  }
}
