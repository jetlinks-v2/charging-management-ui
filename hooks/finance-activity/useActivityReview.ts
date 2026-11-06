import { computed, onScopeDispose, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { onlyMessage } from '@jetlinks-web/utils'
import {
  queryActivities,
  getActivity,
  reviewActivities,
  type ActivitySummary,
  type ActivityDetail
} from '../../api/financeActivity'
import type { Query, QueryTerm } from '../../api/archive'
import { useProjectSwitchGuard } from '../project/useProjectContext'
import { requestErrorMessage } from '../../utils/requestError'

export function useActivityReview(props: { projectId: string }, saved: () => void) {
  const { t } = useI18n()
  const open = ref(false),
    status = ref('PENDING'),
    keyword = ref(''),
    search = ref('')
  const table = ref<{ reload: () => void }>()
  const selected = ref<ActivitySummary[]>([])
  const detail = ref<ActivityDetail>(),
    detailOpen = ref(false),
    loading = ref(false),
    failed = ref(false)
  const busy = ref(false),
    decision = ref<'approve' | 'reject'>(),
    reason = ref('')
  const targets = ref<ActivitySummary[]>([])
  let token = 0,
    disposed = false
  const notify = (error: unknown) => onlyMessage(requestErrorMessage(error, t('Finance.failed')), 'error')
  const params = computed(() => ({ projectId: props.projectId, status: status.value, keyword: search.value }))
  function request(query: Query, config?: { signal: AbortSignal }) {
    if (!open.value || !props.projectId) return Promise.resolve({ success: true, result: { data: [], total: 0 } })
    const terms: QueryTerm[] = []
    if (status.value !== 'ALL') terms.push({ column: 'reviewState', termType: 'eq', value: status.value })
    if (search.value) terms.push({ column: 'name', termType: 'like', value: '%' + search.value + '%' })
    return queryActivities(
      props.projectId,
      {
        terms,
        pageIndex: query.pageIndex,
        pageSize: query.pageSize,
        sorts: [{ name: 'createTime', order: 'desc' }]
      },
      config?.signal
    )
  }
  function show() {
    status.value = 'PENDING'
    search.value = ''
    keyword.value = ''
    selected.value = []
    open.value = true
  }
  async function inspect(row: ActivitySummary) {
    const current = ++token
    detail.value = undefined
    detailOpen.value = true
    loading.value = true
    failed.value = false
    try {
      const result = await getActivity(props.projectId, row.activity.id)
      if (!disposed && current === token) detail.value = result
    } catch (error) {
      if (!disposed && current === token) {
        failed.value = true
        notify(error)
      }
    } finally {
      if (!disposed && current === token) loading.value = false
    }
  }
  function start(action: 'approve' | 'reject', rows = selected.value) {
    if (busy.value || !rows.length || rows.length > 100 || rows.some((row) => row.activity.reviewState !== 'PENDING'))
      return
    targets.value = [...rows]
    decision.value = action
    reason.value = ''
  }
  // 审批与详情绑定打开时的项目/请求代次，旧响应不能覆盖新项目。
  async function submit() {
    if (!decision.value || busy.value || !reason.value.trim() || !targets.value.length) return
    const current = token,
      project = props.projectId
    busy.value = true
    try {
      const results = await reviewActivities(project, targets.value, decision.value, reason.value.trim())
      if (disposed || current !== token) return
      if (detail.value)
        detail.value = results.find((row) => row.activity.id === detail.value?.activity.id) || detail.value
      decision.value = undefined
      selected.value = []
      table.value?.reload()
      saved()
      onlyMessage(t('Activity.reviewSaved'), 'success')
    } catch (error) {
      if (!disposed && current === token) notify(error)
    } finally {
      if (!disposed && current === token) busy.value = false
    }
  }
  function closeDetail() {
    if (busy.value) return
    ++token
    detailOpen.value = false
    detail.value = undefined
    loading.value = false
  }
  watch([status, search], () => {
    selected.value = []
  })
  watch(
    () => props.projectId,
    () => {
      ++token
      open.value = false
      detailOpen.value = false
      detail.value = undefined
      selected.value = []
      decision.value = undefined
      busy.value = false
    },
    { flush: 'sync' }
  )
  useProjectSwitchGuard(() => !open.value && !busy.value)
  onScopeDispose(() => {
    disposed = true
    ++token
  })
  return {
    open,
    status,
    keyword,
    search,
    table,
    selected,
    detail,
    detailOpen,
    loading,
    failed,
    busy,
    decision,
    reason,
    targets,
    params,
    request,
    notify,
    show,
    inspect,
    start,
    submit,
    closeDetail
  }
}
