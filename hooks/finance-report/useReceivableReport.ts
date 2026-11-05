import { computed, onScopeDispose, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { downloadFileByUrl, onlyMessage } from '@jetlinks-web/utils'
import { useProjectContext, useProjectSwitchGuard } from '../project/useProjectContext'
import {
  queryReceivableReport,
  exportReceivableReport,
  type ReportInput,
  type ReportAmounts,
  type ReportRow,
  type ReportGroup
} from '../../api/financeReport'
import type { Query } from '../../api/archive'
import { excelErrorMessage } from '../../utils/archiveFiles'
import { requestErrorMessage } from '../../utils/requestError'

/** 草稿与已查询条件分离；分页、汇总、导出共用已应用范围，代次隔离过期响应。 */
export function useReceivableReport() {
  const { t } = useI18n(),
    context = useProjectContext()
  const defaults = (): ReportInput => ({
    projectIds: context.projectId.value ? [context.projectId.value] : [],
    spaceIds: [],
    subjectIds: [],
    groupBy: 'DETAIL',
    pageIndex: 0,
    pageSize: 12
  })
  const draft = reactive(defaults()),
    active = ref(defaults())
  const summary = ref<ReportAmounts>(),
    failed = ref(false),
    loading = ref(false),
    exporting = ref(false)
  const table = ref<{ reload: () => void }>(),
    revision = ref(0),
    selected = ref<ReportRow[]>([])
  const subjectLabel = ref(''),
    previewUrl = ref(''),
    previewOpen = ref(false)
  const projects = context.projects,
    ready = computed(() => active.value.projectIds.length > 0)
  let generation = 0,
    exportGeneration = 0,
    disposed = false
  const copy = (input: ReportInput) => ({
    ...input,
    projectIds: [...input.projectIds],
    spaceIds: [...input.spaceIds],
    subjectIds: [...input.subjectIds]
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
      receivableNo: undefined,
      dueDateStart: undefined,
      dueDateEnd: undefined,
      collectionStatus: undefined
    })
    active.value = copy(draft)
    subjectLabel.value = ''
    invalidate()
  }
  function reset() {
    if (!exporting.value) resetState()
  }
  function reload() {
    if (!exporting.value) invalidate()
  }
  function group(value: ReportGroup) {
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
      const result = await queryReceivableReport(input, config?.signal)
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
  function drill(rows: ReportRow[]) {
    if (!rows.length || exporting.value) return
    const input = copy(active.value)
    if (input.groupBy === 'PROJECT') input.projectIds = rows.flatMap((row) => (row.projectId ? [row.projectId] : []))
    else if (input.groupBy === 'SUBJECT') {
      input.subjectIds = [...new Set(rows.flatMap((row) => (row.subjectId ? [row.subjectId] : [])))]
      subjectLabel.value = [...new Set(rows.map((row) => row.subjectName))].join('、')
    } else return
    input.groupBy = 'DETAIL'
    input.pageIndex = 0
    active.value = input
    Object.assign(draft, copy(input))
    invalidate()
  }
  function clearSubjects() {
    draft.subjectIds = []
    subjectLabel.value = ''
    apply()
  }
  function closePreview() {
    previewOpen.value = false
    if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
    previewUrl.value = ''
  }
  async function exportRows(format: 'excel' | 'pdf', preview = false) {
    if (!ready.value || exporting.value || loading.value || failed.value) return
    const input = copy(active.value),
      token = ++exportGeneration
    exporting.value = true
    try {
      const blob = await exportReceivableReport(input, format)
      if (disposed || token !== exportGeneration) return
      const url = URL.createObjectURL(blob)
      if (preview) {
        closePreview()
        previewUrl.value = url
        previewOpen.value = true
      } else {
        try {
          downloadFileByUrl(url, t('Report.title'), format === 'excel' ? 'xlsx' : 'pdf')
        } finally {
          setTimeout(() => URL.revokeObjectURL(url), 1000)
        }
      }
    } catch (e) {
      const message = await excelErrorMessage(e, t('Finance.failed'))
      if (!disposed && token === exportGeneration) onlyMessage(message, 'error')
    } finally {
      if (!disposed && token === exportGeneration) exporting.value = false
    }
  }
  watch(
    context.projectId,
    () => {
      ++exportGeneration
      exporting.value = false
      closePreview()
      resetState()
    },
    { flush: 'sync' }
  )
  useProjectSwitchGuard(() => !exporting.value && !previewOpen.value)
  onScopeDispose(() => {
    disposed = true
    ++generation
    closePreview()
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
