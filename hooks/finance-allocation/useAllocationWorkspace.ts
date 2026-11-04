import { computed, onScopeDispose, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { onlyMessage } from '@jetlinks-web/utils'
import * as api from '../../api/financeAllocation'
import type { Query } from '../../api/archive'
import { requestErrorMessage } from '../../utils/requestError'
import { useProjectContext, useProjectSwitchGuard } from '../project/useProjectContext'
/** 票本详情只读；编辑、单号状态弹窗持有项目切换守卫，迟到请求不替换当前票本。 */
export function useAllocationWorkspace() {
  const { t } = useI18n(),
    { projectId } = useProjectContext()
  const table = ref<{ reload: () => void }>(),
    poolTable = ref<{ reload: () => void }>(),
    terms = ref<Query['terms']>([])
  const open = ref(false),
    readOnly = ref(true),
    loading = ref(false),
    failed = ref(false),
    saving = ref(false),
    tab = ref('info')
  const detail = ref<api.AllocationBook>(),
    options = ref<api.AllocationOptions>({ types: {}, sources: {} }),
    numberTarget = ref<api.AllocationNumber>()
  const params = computed(() => ({
    projectId: projectId.value,
    terms: terms.value,
    sorts: [{ name: 'createTime', order: 'desc' }]
  }))
  const notify = (e: unknown) => onlyMessage(requestErrorMessage(e, t('Finance.failed')), 'error')
  const reload = () => table.value?.reload()
  const request = (q: Query, c?: { signal: AbortSignal }) => api.queryAllocations(projectId.value, q, c?.signal)
  const poolRequest = (q: Query, c?: { signal: AbortSignal }) =>
    api.queryAllocationNumbers(detail.value!.projectId, detail.value!.id, q, c?.signal)
  const logRequest = (q: Query, c?: { signal: AbortSignal }) =>
    api.queryAllocationLogs(detail.value!.projectId, detail.value!.id, q, c?.signal)
  let generation = 0,
    disposed = false,
    selectedId: string | undefined
  async function select(id?: string, readonly = true, nextTab = 'info') {
    if (!projectId.value || saving.value) return
    const token = ++generation,
      project = projectId.value
    selectedId = id
    open.value = true
    readOnly.value = readonly
    loading.value = true
    failed.value = false
    detail.value = undefined
    tab.value = nextTab
    try {
      const [row, opts] = await Promise.all([
        id ? api.getAllocation(project, id) : Promise.resolve(undefined),
        readonly ? Promise.resolve(undefined) : api.getAllocationOptions(project)
      ])
      if (disposed || token !== generation) return
      detail.value = row
      if (opts) options.value = opts
    } catch (e) {
      if (!disposed && token === generation) {
        failed.value = true
        notify(e)
      }
    } finally {
      if (!disposed && token === generation) loading.value = false
    }
  }
  function close() {
    if (saving.value || numberTarget.value) return
    ++generation
    open.value = false
    detail.value = undefined
  }
  async function save(input: api.AllocationInput) {
    if (!projectId.value || saving.value || readOnly.value || loading.value || failed.value) return
    saving.value = true
    try {
      await api.saveAllocation(projectId.value, detail.value?.id, { ...input, version: detail.value?.version })
      open.value = false
      detail.value = undefined
      onlyMessage(t('Allocation.saved'), 'success')
      reload()
    } catch (e) {
      notify(e)
    } finally {
      saving.value = false
    }
  }
  async function remove(row: api.AllocationBook) {
    if (saving.value || !projectId.value) return
    saving.value = true
    try {
      await api.deleteAllocation(projectId.value, row)
      onlyMessage(t('Allocation.deleted'), 'success')
      reload()
    } catch (e) {
      notify(e)
    } finally {
      saving.value = false
    }
  }
  async function changeNumber(reason: string) {
    const row = numberTarget.value,
      book = detail.value
    if (!row || !book || saving.value) return
    saving.value = true
    try {
      await api.setAllocationNumberState(book.projectId, book.id, row, reason)
      numberTarget.value = undefined
      poolTable.value?.reload()
      reload()
      detail.value = await api.getAllocation(book.projectId, book.id)
      onlyMessage(t('Allocation.changed'), 'success')
    } catch (e) {
      notify(e)
    } finally {
      saving.value = false
    }
  }
  useProjectSwitchGuard(() => !saving.value && !(open.value && !readOnly.value) && !numberTarget.value)
  watch(projectId, () => {
    ++generation
    open.value = false
    detail.value = undefined
    numberTarget.value = undefined
    terms.value = []
  })
  onScopeDispose(() => {
    disposed = true
    ++generation
  })
  return {
    projectId,
    table,
    poolTable,
    terms,
    params,
    request,
    poolRequest,
    logRequest,
    open,
    readOnly,
    loading,
    failed,
    saving,
    tab,
    detail,
    options,
    numberTarget,
    select,
    retry: () => select(selectedId, readOnly.value, tab.value),
    close,
    save,
    remove,
    changeNumber,
    reload,
    notify
  }
}
