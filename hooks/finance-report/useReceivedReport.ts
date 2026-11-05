import { computed, onScopeDispose, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { onlyMessage } from '@jetlinks-web/utils'
import { useProjectContext, useProjectSwitchGuard } from '../project/useProjectContext'
import {
  queryReceivedReport,
  exportReceivedReport,
  type ReceivedInput,
  type ReceivedAmounts,
  type ReceivedRow,
  type ReceivedGroup
} from '../../api/financeReceivedReport'
import type { Query } from '../../api/archive'
import { useReportExport } from './useReportExport'
import { requestErrorMessage } from '../../utils/requestError'

/** 草稿与已查询条件分离；分页、汇总、导出共用已应用范围，代次隔离过期响应。 */
export function useReceivedReport() {
  const { t } = useI18n(),
    context = useProjectContext()
  const defaults = (): ReceivedInput => ({
    projectIds: context.projectId.value ? [context.projectId.value] : [],
    spaceIds: [],
    subjectIds: [],
    paymentMethods: [],
    sourceTypes: [],
    groupBy: 'DETAIL',
    pageIndex: 0,
    pageSize: 12
  })
  const draft = reactive(defaults()),
    active = ref(defaults())
  const summary = ref<ReceivedAmounts>(),
    failed = ref(false),
    loading = ref(false)
  const table = ref<{ reload: () => void }>(),
    revision = ref(0),
    selected = ref<ReceivedRow[]>([])
  const subjectLabel = ref(''),
    methodLabel = ref('')
  const projects = context.projects,
    ready = computed(() => active.value.projectIds.length > 0)
  let generation = 0,
    disposed = false
  const copy = (input: ReceivedInput) => ({
    ...input,
    projectIds: [...input.projectIds],
    spaceIds: [...input.spaceIds],
    subjectIds: [...input.subjectIds],
    paymentMethods: [...input.paymentMethods],
    sourceTypes: [...input.sourceTypes]
  })
  const { exporting, previewUrl, previewOpen, closePreview, exportRows } = useReportExport({
    projectId: context.projectId,
    enabled: () => ready.value && !loading.value && !failed.value,
    input: () => copy(active.value),
    title: () => t('Received.title'),
    fallback: () => t('Finance.failed'),
    request: exportReceivedReport
  })
  const notify = (e: unknown) => onlyMessage(requestErrorMessage(e, t('Finance.failed')), 'error')
  function invalidate() {
    ++generation
    summary.value = undefined
    failed.value = false
    loading.value = false
    selected.value = []
    revision.value++
  }
  function apply() {
    if (exporting.value) return
    if (!draft.projectIds.length) {
      onlyMessage(t('Report.chooseProjects'), 'warning')
      return
    }
    active.value = { ...copy(draft), groupBy: active.value.groupBy, pageIndex: 0 }
    invalidate()
  }
  function resetState() {
    Object.assign(draft, defaults(), {
      customerName: undefined,
      fullName: undefined,
      paymentNo: undefined,
      collectorName: undefined,
      receivedDateStart: undefined,
      receivedDateEnd: undefined
    })
    active.value = copy(draft)
    subjectLabel.value = ''
    methodLabel.value = ''
    invalidate()
  }
  function reset() {
    if (!exporting.value) resetState()
  }
  function reload() {
    if (!exporting.value) invalidate()
  }
  function group(value: ReceivedGroup) {
    if (exporting.value) return
    active.value = { ...copy(active.value), groupBy: value, pageIndex: 0 }
    invalidate()
  }
  async function request(q: Query, config?: { signal?: AbortSignal }) {
    const token = ++generation,
      input = { ...copy(active.value), pageIndex: q.pageIndex || 0, pageSize: q.pageSize || 12 }
    summary.value = undefined
    failed.value = false
    selected.value = []
    if (!input.projectIds.length)
      return { success: true, result: { data: [], total: 0, pageIndex: input.pageIndex, pageSize: input.pageSize } }
    loading.value = true
    try {
      const result = await queryReceivedReport(input, config?.signal)
      if (!disposed && token === generation) summary.value = result.summary
      return { success: true, result: result.page }
    } catch (e) {
      if (!disposed && token === generation && !config?.signal?.aborted) {
        failed.value = true
        notify(e)
      }
      throw e
    } finally {
      if (!disposed && token === generation) loading.value = false
    }
  }
  function drill(rows: ReceivedRow[]) {
    if (!rows.length || exporting.value) return
    const input = copy(active.value)
    if (input.groupBy === 'PROJECT') input.projectIds = rows.flatMap((row) => (row.projectId ? [row.projectId] : []))
    else if (input.groupBy === 'SUBJECT') {
      input.subjectIds = [...new Set(rows.flatMap((row) => (row.subjectId ? [row.subjectId] : [])))]
      subjectLabel.value = [...new Set(rows.map((row) => row.subjectName))].join('、')
    } else if (input.groupBy === 'METHOD') {
      input.paymentMethods = [...new Set(rows.flatMap((row) => (row.method ? [row.method] : [])))]
      methodLabel.value = [...new Set(rows.map((row) => row.methodText))].join('、')
    } else if (input.groupBy === 'SOURCE') {
      input.sourceTypes = [...new Set(rows.flatMap((row) => (row.sourceType ? [row.sourceType] : [])))]
    } else return
    input.groupBy = 'DETAIL'
    input.pageIndex = 0
    active.value = input
    Object.assign(draft, copy(input))
    invalidate()
  }
  function clearMethods() {
    draft.paymentMethods = []
    methodLabel.value = ''
    apply()
  }
  function clearSubjects() {
    draft.subjectIds = []
    subjectLabel.value = ''
    apply()
  }
  watch(
    context.projectId,
    () => {
      resetState()
    },
    { flush: 'sync' }
  )
  useProjectSwitchGuard(() => !exporting.value && !previewOpen.value)
  onScopeDispose(() => {
    disposed = true
    ++generation
  })
  return {
    draft,
    active,
    summary,
    failed,
    loading,
    exporting,
    table,
    revision,
    selected,
    projects,
    ready,
    subjectLabel,
    methodLabel,
    clearMethods,
    previewUrl,
    previewOpen,
    request,
    apply,
    reset,
    reload,
    group,
    drill,
    clearSubjects,
    closePreview,
    exportRows
  }
}
