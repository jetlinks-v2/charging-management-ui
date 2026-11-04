import { computed, onScopeDispose, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { onlyMessage } from '@jetlinks-web/utils'
import * as api from '../../api/financeActivity'
import type { Query } from '../../api/archive'
import { useProjectContext, useProjectSwitchGuard } from '../project/useProjectContext'
import { requestErrorMessage } from '../../utils/requestError'

/** 活动编辑绑定打开时的项目，失败保留输入；迟到请求不能覆盖新选择。 */
export function useActivityWorkspace() {
  const { t } = useI18n(),
    { projectId } = useProjectContext()
  const table = ref<{ reload: () => void }>(),
    terms = ref<Query['terms']>([])
  const open = ref(false),
    readOnly = ref(true),
    loading = ref(false),
    failed = ref(false),
    saving = ref(false),
    uploading = ref(false)
  const detail = ref<api.ActivityDetail>(),
    options = ref<api.ActivityOptions>({ spaces: [], types: [], standards: [] }),
    history = ref<api.ActivitySummary>()
  const dateChange = ref<{ row: api.ActivitySummary; extend: boolean }>()
  let generation = 0,
    disposed = false,
    selectedId: string | undefined
  const params = computed(() => ({
    projectId: projectId.value,
    terms: terms.value,
    sorts: [{ name: 'createTime', order: 'desc' }]
  }))
  const notify = (e: unknown) => onlyMessage(requestErrorMessage(e, t('Finance.failed')), 'error')
  const reload = () => table.value?.reload()
  const request = (query: Query, config?: { signal?: AbortSignal }) =>
    projectId.value
      ? api.queryActivities(projectId.value, query, config?.signal)
      : Promise.resolve({ success: true, result: { data: [], total: 0, pageIndex: 0, pageSize: 12 } })
  async function select(id?: string, view = true) {
    if (!projectId.value || saving.value || uploading.value) return
    const project = projectId.value,
      token = ++generation
    selectedId = id
    open.value = true
    readOnly.value = view
    loading.value = true
    failed.value = false
    detail.value = undefined
    try {
      // 只读详情不依赖可选字典当前启停状态；历史名称由服务端快照提供。
      const [row, choices] = await Promise.all([
        id ? api.getActivity(project, id) : undefined,
        view ? undefined : api.getActivityOptions(project)
      ])
      if (!disposed && token === generation) {
        detail.value = row
        if (choices) options.value = choices
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
    if (!saving.value && !uploading.value) {
      ++generation
      open.value = false
      detail.value = undefined
    }
  }
  async function save(input: api.ActivityInput) {
    if (!projectId.value || saving.value || uploading.value || loading.value || failed.value || readOnly.value) return
    saving.value = true
    try {
      await api.saveActivity(projectId.value, detail.value?.activity.id, {
        ...input,
        version: detail.value?.activity.version
      })
      open.value = false
      onlyMessage(t('Finance.saved', { name: input.name }), 'success')
      reload()
    } catch (e) {
      notify(e)
    } finally {
      saving.value = false
    }
  }
  async function change(row: api.ActivitySummary, remove = false) {
    if (!projectId.value || saving.value || uploading.value) return
    saving.value = true
    try {
      if (remove) await api.deleteActivity(projectId.value, row)
      else await api.setActivityState(projectId.value, row)
      onlyMessage(t('Activity.changed'), 'success')
      reload()
    } catch (e) {
      notify(e)
    } finally {
      saving.value = false
    }
  }
  async function saveEnd(endDate: string) {
    const target = dateChange.value
    if (!projectId.value || !target || saving.value) return
    saving.value = true
    try {
      await api.changeActivityEnd(projectId.value, target.row, endDate, target.extend)
      dateChange.value = undefined
      onlyMessage(t('Activity.changed'), 'success')
      reload()
    } catch (e) {
      notify(e)
    } finally {
      saving.value = false
    }
  }
  useProjectSwitchGuard(
    () => !saving.value && !uploading.value && !(open.value && !readOnly.value) && !dateChange.value
  )
  watch(projectId, () => {
    close()
    history.value = undefined
    dateChange.value = undefined
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
    uploading,
    detail,
    options,
    history,
    dateChange,
    select,
    retry: () => select(selectedId, readOnly.value),
    close,
    save,
    change,
    saveEnd,
    reload,
    notify
  }
}
