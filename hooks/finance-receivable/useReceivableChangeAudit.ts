import { computed, onScopeDispose, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { onlyMessage } from '@jetlinks-web/utils'
import type { Query, QueryTerm } from '../../api/archive'
import {
  queryReceivableChanges,
  getReceivableChange,
  decideReceivableChange,
  type ReceivableChangeDetail
} from '../../api/financeReceivable'
import { useProjectSwitchGuard } from '../project/useProjectContext'
import { requestErrorMessage } from '../../utils/requestError'

export function useReceivableChangeAudit(props: { projectId: string }, saved: () => void) {
  const { t } = useI18n()
  const open = ref(false),
    status = ref('PENDING'),
    operation = ref('ALL')
  const keyword = ref(''),
    search = ref('')
  const table = ref<{ reload: () => void }>()
  const detail = ref<ReceivableChangeDetail>()
  const detailOpen = ref(false),
    loading = ref(false),
    failed = ref(false),
    busy = ref(false)
  const decision = ref<'approve' | 'reject'>(),
    reason = ref('')
  let generation = 0,
    disposed = false
  const notify = (error: unknown) => onlyMessage(requestErrorMessage(error, t('Finance.failed')), 'error')
  const params = computed(() => ({
    project: props.projectId,
    open: open.value,
    status: status.value,
    operation: operation.value,
    search: search.value
  }))
  function request(query: Query, config?: { signal: AbortSignal }) {
    if (!open.value || !props.projectId) return Promise.resolve({ success: true, result: { data: [], total: 0 } })
    const terms: QueryTerm[] = []
    if (status.value !== 'ALL') terms.push({ column: 'status', termType: 'eq', value: status.value })
    if (operation.value !== 'ALL') terms.push({ column: 'operation', termType: 'eq', value: operation.value })
    if (search.value) terms.push({ column: 'fullName', termType: 'like', value: '%' + search.value + '%' })
    return queryReceivableChanges(
      props.projectId,
      { terms, pageIndex: query.pageIndex, pageSize: query.pageSize },
      config?.signal
    )
  }
  async function inspect(id: string) {
    const token = ++generation,
      project = props.projectId
    detail.value = undefined
    detailOpen.value = true
    loading.value = true
    failed.value = false
    try {
      const result = await getReceivableChange(project, id)
      if (!disposed && token === generation) detail.value = result
    } catch (error) {
      if (!disposed && token === generation) {
        failed.value = true
        notify(error)
      }
    } finally {
      if (!disposed && token === generation) loading.value = false
    }
  }
  function start(action: 'approve' | 'reject') {
    if (!detail.value || detail.value.record.status !== 'PENDING' || busy.value) return
    decision.value = action
    reason.value = ''
  }
  async function submit() {
    if (!detail.value || !decision.value || !reason.value.trim() || busy.value) return
    const token = generation,
      project = props.projectId
    busy.value = true
    try {
      const record = await decideReceivableChange(project, detail.value.record, decision.value, reason.value.trim())
      if (disposed || token !== generation) return
      detail.value = { ...detail.value, record }
      decision.value = undefined
      onlyMessage(t('ChangeAudit.saved'), 'success')
      table.value?.reload()
      saved()
    } catch (error) {
      if (!disposed && token === generation) notify(error)
    } finally {
      if (!disposed && token === generation) busy.value = false
    }
  }
  function show() {
    status.value = 'PENDING'
    operation.value = 'ALL'
    keyword.value = ''
    search.value = ''
    open.value = true
  }
  function closeDetail() {
    if (busy.value) return
    ++generation
    detailOpen.value = false
    detail.value = undefined
    decision.value = undefined
    loading.value = false
  }
  watch(
    () => props.projectId,
    () => {
      // 会话重置可能绕过正常项目切换守卫，强制丢弃旧项目请求的迟到结果。
      ++generation
      detail.value = undefined
      detailOpen.value = false
      decision.value = undefined
      loading.value = false
      busy.value = false
      open.value = false
    },
    { flush: 'sync' }
  )
  useProjectSwitchGuard(() => !open.value && !detailOpen.value && !busy.value)
  onScopeDispose(() => {
    disposed = true
    ++generation
  })
  return {
    open,
    status,
    operation,
    keyword,
    search,
    table,
    params,
    detail,
    detailOpen,
    loading,
    failed,
    busy,
    decision,
    reason,
    notify,
    request,
    inspect,
    start,
    submit,
    show,
    closeDetail
  }
}
