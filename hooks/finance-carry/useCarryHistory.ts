import { computed, onScopeDispose, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { onlyMessage } from '@jetlinks-web/utils'
import * as api from '../../api/financeCarry'
import type { Query } from '../../api/archive'
import { requestErrorMessage } from '../../utils/requestError'
import { useProjectSwitchGuard } from '../project/useProjectContext'

export function useCarryHistory(props: { projectId: string; planId: string }) {
  const { t } = useI18n(),
    table = ref<{ reload: () => void }>()
  const run = ref<api.CarryRun>(),
    work = ref<api.CarryWork>(),
    loading = ref(false),
    failed = ref(false),
    retrying = ref(false)
  const status = ref('')
  let generation = 0,
    disposed = false,
    retryDetail: (() => Promise<void>) | undefined
  const notify = (e: unknown) => onlyMessage(requestErrorMessage(e, t('Finance.failed')), 'error')
  const level = computed(() => (work.value ? 'items' : run.value ? 'works' : 'runs'))
  const params = computed(() => ({
    projectId: props.projectId,
    planId: props.planId,
    runId: run.value?.id,
    workId: work.value?.id,
    terms: status.value ? [{ column: 'status', termType: 'eq', value: status.value }] : [],
    sorts: [{ name: 'createTime', order: 'desc' }]
  }))
  function request(q: Query, config?: { signal?: AbortSignal }) {
    const project = props.projectId,
      plan = props.planId,
      signal = config?.signal
    if (work.value && run.value) return api.queryCarryItems(project, plan, run.value.id, work.value.id, q, signal)
    if (run.value) return api.queryCarryWorks(project, plan, run.value.id, q, signal)
    return api.queryCarryRuns(project, plan, q, signal)
  }
  async function load<T>(action: () => Promise<T>, publish: (result: T) => void) {
    const token = ++generation
    retryDetail = () => load(action, publish)
    loading.value = true
    failed.value = false
    try {
      const result = await action()
      if (!disposed && token === generation) publish(result)
    } catch (e) {
      if (!disposed && token === generation) {
        failed.value = true
        notify(e)
      }
    } finally {
      if (!disposed && token === generation) loading.value = false
    }
  }
  async function selectRun(row: api.CarryRun) {
    const project = props.projectId,
      plan = props.planId
    await load(
      () => api.getCarryRun(project, plan, row.id),
      (result) => {
        run.value = result
        work.value = undefined
        status.value = ''
      }
    )
  }
  async function selectWork(row: api.CarryWork) {
    if (!run.value) return
    const project = props.projectId,
      plan = props.planId,
      runId = run.value.id
    await load(
      () => api.getCarryWork(project, plan, runId, row.id),
      (result) => {
        work.value = result
        status.value = ''
      }
    )
  }
  function back() {
    if (retrying.value) return
    ++generation
    failed.value = false
    loading.value = false
    status.value = ''
    if (work.value) work.value = undefined
    else run.value = undefined
  }
  async function retry(row: api.CarryRun) {
    if (retrying.value || row.status !== 'PARTIAL') return
    retrying.value = true
    try {
      const result = await api.retryCarryRun(props.projectId, props.planId, row.id)
      if (!disposed && run.value?.id === result.id) run.value = result
      if (!disposed) onlyMessage(t('Carry.retrySaved'), 'success')
    } catch (e) {
      if (!disposed) notify(e)
    } finally {
      if (!disposed) {
        retrying.value = false
        table.value?.reload()
      }
    }
  }
  useProjectSwitchGuard(() => !retrying.value)
  onScopeDispose(() => {
    disposed = true
    ++generation
  })
  return {
    table,
    run,
    work,
    loading,
    failed,
    retrying,
    status,
    level,
    params,
    request,
    selectRun,
    selectWork,
    back,
    retry,
    reloadDetail: () => retryDetail?.(),
    notify
  }
}
