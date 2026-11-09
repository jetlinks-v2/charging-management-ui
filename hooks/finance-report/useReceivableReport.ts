import { computed, onScopeDispose, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { onlyMessage } from '@jetlinks-web/utils'
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
import { useReportExport } from './useReportExport'
import { requestErrorMessage } from '../../utils/requestError'

/** 草稿与已查询条件分离；分页、汇总、导出共用已应用范围，代次隔离过期响应。 */
export function useReceivableReport() {
  const { t } = useI18n(),
    context = useProjectContext()
  const defaults = (): ReportInput => ({
    projectIds: [...context.reportProjectIds.value],
    spaceIds: [],
    subjectIds: [],
    subjectGroups: [],
    groupBy: 'SUBJECT',
    pageIndex: 0,
    pageSize: 12
  })
  const parent = ref<ReportInput>()
  const draft = reactive(defaults()),
    active = ref(defaults())
  const summary = ref<ReportAmounts>(),
    failed = ref(false),
    loading = ref(false)
  const table = ref<{ reload: () => void }>(),
    revision = ref(0),
    selected = ref<ReportRow[]>([])
  const subjectLabel = ref('')
  const projects = context.projects,
    ready = computed(() => active.value.projectIds.length > 0)
  let generation = 0,
    disposed = false
  const copy = (input: ReportInput) => ({
    ...input,
    projectIds: [...input.projectIds],
    spaceIds: [...input.spaceIds],
    subjectGroups: input.subjectGroups?.map((key) => ({ ...key })),
    subjectIds: [...input.subjectIds]
  })
  const { exporting, previewUrl, previewOpen, closePreview, exportRows } = useReportExport({
    projectId: computed(() => context.reportProjectIds.value.join(',')),
    enabled: () => ready.value && !loading.value && !failed.value,
    input: () => copy(active.value),
    title: () => t('Report.title'),
    fallback: () => t('Finance.failed'),
    request: exportReceivableReport
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
    if (!context.reportProjectIds.value.length) {
      onlyMessage(t('Report.chooseProjects'), 'warning')
      return
    }
    const projectIds = draft.projectIds.filter((id) => context.reportProjectIds.value.includes(id))
    active.value = {
      ...copy(draft),
      projectIds: projectIds.length ? projectIds : [...context.reportProjectIds.value],
      groupBy: active.value.groupBy,
      pageIndex: 0
    }
    invalidate()
  }
  function resetState() {
    parent.value = undefined
    for (const key of Object.keys(draft)) delete (draft as unknown as Record<string, unknown>)[key]
    Object.assign(draft, defaults(), {
      customerName: undefined,
      fullName: undefined,
      receivableNo: undefined,
      receivableDateStart: undefined,
      receivableDateEnd: undefined,
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
  function back() {
    if (!parent.value || exporting.value) return
    active.value = copy(parent.value)
    for (const key of Object.keys(draft)) delete (draft as unknown as Record<string, unknown>)[key]
    Object.assign(draft, copy(parent.value))
    parent.value = undefined
    subjectLabel.value = ''
    invalidate()
  }
  function view(value: ReportGroup | 'OVERDUE') {
    if (exporting.value) return
    active.value = {
      ...copy(active.value),
      groupBy: value === 'OVERDUE' ? 'DETAIL' : value,
      overdueOnly: value === 'OVERDUE',
      pageIndex: 0
    }
    Object.assign(draft, copy(active.value))
    parent.value = undefined
    invalidate()
  }
  function group(value: ReportGroup) {
    if (exporting.value) return
    parent.value = undefined
    active.value = { ...copy(active.value), groupBy: value, pageIndex: 0 }
    Object.assign(draft, copy(active.value))
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
    if (input.groupBy === 'PROJECT')
      input.projectIds = [
        ...new Set(
          rows.flatMap((row) => (row.projectId && input.projectIds.includes(row.projectId) ? [row.projectId] : []))
        )
      ]
    else if (input.groupBy === 'SUBJECT') {
      input.subjectIds = [...new Set(rows.flatMap((row) => (row.subjectId ? [row.subjectId] : [])))]
      input.subjectGroups = rows.map((row) => ({ value: row.subjectId, label: row.subjectName }))
      subjectLabel.value = [...new Set(rows.map((row) => row.subjectName))].join('、')
    } else if (input.groupBy === 'SPACE' || input.groupBy === 'CUSTOMER' || input.groupBy === 'MONTH') {
      // 单行下钻保留项目身份，避免同名客户或跨项目空间混入明细。
      if (rows.length !== 1) return
      if (rows[0].projectId) input.projectIds = [rows[0].projectId]
      if (input.groupBy === 'SPACE') input.spaceIds = rows[0].spaceId ? [rows[0].spaceId] : []
      if (input.groupBy === 'CUSTOMER') input.customerIds = rows[0].customerId ? [rows[0].customerId] : []
      if (input.groupBy === 'MONTH') input.months = rows[0].receivableDate ? [rows[0].receivableDate] : []
    } else return
    if (!input.projectIds.length) return
    parent.value = copy(active.value)
    input.groupBy = 'DETAIL'
    input.pageIndex = 0
    active.value = input
    Object.assign(draft, copy(input))
    invalidate()
  }
  function clearProjects() {
    draft.projectIds = [...context.reportProjectIds.value]
    apply()
  }
  function clearSubjects() {
    draft.subjectIds = []
    draft.subjectGroups = []
    subjectLabel.value = ''
    apply()
  }
  watch(
    context.reportProjectIds,
    () => {
      resetState()
    },
    { flush: 'sync', deep: true }
  )
  useProjectSwitchGuard(() => !exporting.value && !previewOpen.value)
  onScopeDispose(() => {
    disposed = true
    ++generation
  })
  return {
    view,
    parent,
    back,
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
    clearProjects,
    closePreview,
    exportRows
  }
}
