import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { onlyMessage } from '@jetlinks-web/utils'
import type { Query } from '../../api/archive'
import { queryBillingTasks, retryBillingTask, type BillingTask } from '../../api/financeSetting'
import { requestErrorMessage } from '../../utils/requestError'
import { useProjectSwitchGuard } from '../project/useProjectContext'

/** 任务固定在打开时的项目；失败只用消息提示，错误明细只属于对应任务记录。 */
export function useBillingTasks(projectId: string) {
  const { t } = useI18n()
  const table = ref<{ reload: () => void }>()
  const status = ref('')
  const retrying = ref('')
  const params = computed(() => ({
    terms: status.value ? [{ column: 'status', termType: 'eq', value: status.value }] : [],
    sorts: [{ name: 'createTime', order: 'desc' }]
  }))
  const notify = (error: unknown) => onlyMessage(requestErrorMessage(error, t('Finance.failed')), 'error')
  const reload = () => table.value?.reload()
  const request = (query: Query, config?: { signal: AbortSignal }) =>
    queryBillingTasks(projectId, query, config?.signal)
  async function retry(row: BillingTask) {
    if (retrying.value || row.status !== 'FAILED') return
    retrying.value = row.id
    try {
      await retryBillingTask(projectId, row.id)
      onlyMessage(t('Setting.taskRetryQueued'), 'success')
      reload()
    } catch (error) {
      notify(error)
    } finally {
      retrying.value = ''
    }
  }
  useProjectSwitchGuard(() => false)
  return { table, status, params, retrying, notify, reload, request, retry }
}
