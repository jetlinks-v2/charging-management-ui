import { computed, onScopeDispose, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { onlyMessage } from '@jetlinks-web/utils'
import * as api from '../../api/financeCarry'
import type { Query } from '../../api/archive'
import { useProjectContext, useProjectSwitchGuard } from '../project/useProjectContext'
import { requestErrorMessage } from '../../utils/requestError'

export function useCarryWorkspace() {
  const { t } = useI18n(),
    { projectId } = useProjectContext()
  const table = ref<{ reload: () => void }>(),
    terms = ref<Query['terms']>([])
  const open = ref(false),
    readOnly = ref(true),
    loading = ref(false),
    failed = ref(false),
    saving = ref(false)
  const detail = ref<api.CarryPlan>(),
    subjects = ref<api.CarrySubject[]>([]),
    standards = ref<api.CarryStandard[]>([]),
    history = ref<api.CarryPlan>()
  let generation = 0,
    disposed = false,
    selectedId: string | undefined
  const params = computed(() => ({
    projectId: projectId.value,
    terms: terms.value,
    sorts: [{ name: 'createTime', order: 'desc' }]
  }))
  const notify = (error: unknown) => onlyMessage(requestErrorMessage(error, t('Finance.failed')), 'error')
  const reload = () => table.value?.reload()
  const request = (query: Query, config?: { signal?: AbortSignal }) =>
    projectId.value
      ? api.queryCarryPlans(projectId.value, query, config?.signal)
      : Promise.resolve({ success: true, result: { data: [], total: 0, pageIndex: 0, pageSize: 12 } })
  async function select(id?: string, view = true) {
    const project = projectId.value,
      token = ++generation
    if (!project || saving.value) return
    selectedId = id
    open.value = true
    readOnly.value = view
    loading.value = true
    failed.value = false
    detail.value = undefined
    subjects.value = []
    standards.value = []
    try {
      const [options, standardOptions, row] = await Promise.all([
        api.getCarrySubjects(project),
        api.getCarryStandards(project),
        id ? api.getCarryPlan(project, id) : undefined
      ])
      if (!disposed && token === generation) {
        subjects.value = options
        standards.value = standardOptions
        detail.value = row
      }
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
    if (!saving.value) {
      ++generation
      open.value = false
      detail.value = undefined
    }
  }
  async function save(input: api.CarryInput) {
    if (saving.value || loading.value || failed.value || readOnly.value || !projectId.value) return
    saving.value = true
    try {
      await api.saveCarryPlan(projectId.value, detail.value?.plan.id, { ...input, version: detail.value?.plan.version })
      open.value = false
      onlyMessage(t('Carry.saved', { name: input.name }), 'success')
      reload()
    } catch (e) {
      notify(e)
    } finally {
      saving.value = false
    }
  }
  async function change(row: api.CarryPlan, remove = false) {
    if (saving.value || !projectId.value) return
    saving.value = true
    try {
      if (remove) await api.deleteCarryPlan(projectId.value, row)
      else await api.changeCarryState(projectId.value, row)
      onlyMessage(t(remove ? 'Carry.deleted' : 'Carry.stateSaved', { name: row.input.name }), 'success')
      reload()
    } catch (e) {
      notify(e)
    } finally {
      saving.value = false
    }
  }
  useProjectSwitchGuard(() => !saving.value && !(open.value && !readOnly.value))
  watch(projectId, () => {
    close()
    history.value = undefined
    terms.value = []
  })
  onScopeDispose(() => {
    disposed = true
    ++generation
  })
  return {
    projectId,
    table,
    terms,
    params,
    request,
    open,
    readOnly,
    loading,
    failed,
    saving,
    detail,
    subjects,
    standards,
    history,
    select,
    retry: () => select(selectedId, readOnly.value),
    close,
    save,
    change,
    reload,
    notify
  }
}
