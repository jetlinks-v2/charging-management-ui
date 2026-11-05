import { computed, onScopeDispose, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { onlyMessage } from '@jetlinks-web/utils'
import { useProjectContext, useProjectSwitchGuard } from '../project/useProjectContext'
import { queryRefunds, getRefund, type RefundDetail } from '../../api/financeRefund'
import type { Query } from '../../api/archive'
import { requestErrorMessage } from '../../utils/requestError'
export function useRefundRecords() {
  const { t } = useI18n()
  const context = useProjectContext()
  const projectId = context.projectId
  const table = ref<{ reload: () => void }>()
  const terms = ref<Query['terms']>([])
  const params = computed(() => ({
    projectId: projectId.value,
    terms: terms.value,
    sorts: [{ name: 'createTime', order: 'desc' }]
  }))
  const open = ref(false),
    loading = ref(false),
    failed = ref(false),
    detail = ref<RefundDetail>()
  let disposed = false,
    generation = 0
  const notify = (error: unknown) => onlyMessage(requestErrorMessage(error, t('Finance.failed')), 'error')
  const request = (query: Query, config?: { signal: AbortSignal }) =>
    projectId.value
      ? queryRefunds(projectId.value, query, config?.signal)
      : Promise.resolve({ success: true, result: { data: [], total: 0, pageIndex: 0, pageSize: 12 } })
  function close() {
    ++generation
    open.value = false
    detail.value = undefined
  }
  async function select(id: string) {
    const token = ++generation,
      project = projectId.value
    if (!project) return
    open.value = true
    loading.value = true
    failed.value = false
    detail.value = undefined
    try {
      const value = await getRefund(project, id)
      if (!disposed && token === generation) detail.value = value
    } catch (error) {
      if (!disposed && token === generation) {
        failed.value = true
        notify(error)
      }
    } finally {
      if (!disposed && token === generation) loading.value = false
    }
  }
  useProjectSwitchGuard(() => !open.value)
  watch(projectId, () => {
    close()
    terms.value = []
  })
  onScopeDispose(() => {
    disposed = true
    ++generation
  })
  return { projectId, table, terms, params, open, loading, failed, detail, request, select, close, notify }
}
