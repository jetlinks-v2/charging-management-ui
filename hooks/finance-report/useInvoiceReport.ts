import { computed, onScopeDispose, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { onlyMessage } from '@jetlinks-web/utils'
import { useProjectContext, useProjectSwitchGuard } from '../project/useProjectContext'
import {
  queryInvoiceReport,
  exportInvoiceReport,
  type InvoiceReportInput,
  type InvoiceAmounts,
  type InvoiceRow,
  type InvoiceGroup
} from '../../api/financeInvoiceReport'
import type { Query } from '../../api/archive'
import { useReportExport } from './useReportExport'
import { requestErrorMessage } from '../../utils/requestError'

/** 草稿与已查询条件分离；分页、汇总、导出共用已应用范围，代次隔离过期响应。 */
export function useInvoiceReport() {
  const { t } = useI18n(),
    context = useProjectContext()
  const defaults = (): InvoiceReportInput => ({
    projectIds: [...context.reportProjectIds.value],
    spaceIds: [],
    subjectIds: [],
    subjectGroups: [],
    groupBy: 'DETAIL',
    pageIndex: 0,
    pageSize: 12
  })
  const draft = reactive(defaults()),
    active = ref(defaults())
  const summary = ref<InvoiceAmounts>(),
    failed = ref(false),
    loading = ref(false)
  const table = ref<{ reload: () => void }>(),
    revision = ref(0),
    selected = ref<InvoiceRow[]>([])
  const subjectLabel = ref('')
  const projects = context.projects,
    ready = computed(() => active.value.projectIds.length > 0)
  let generation = 0,
    disposed = false
  const copy = (input: InvoiceReportInput) => ({
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
    title: () => t('InvoiceReport.title'),
    fallback: () => t('Finance.failed'),
    request: exportInvoiceReport
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
    Object.assign(draft, defaults(), {
      customerName: undefined,
      fullName: undefined,
      sourceId: undefined,
      sourceType: undefined,
      invoiceNo: undefined,
      invoiceType: undefined,
      invoiceStatus: undefined,
      invoiceDateStart: undefined,
      invoiceDateEnd: undefined
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
  function group(value: InvoiceGroup) {
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
      const result = await queryInvoiceReport(input, config?.signal)
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
  function drill(rows: InvoiceRow[]) {
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
    } else return
    if (!input.projectIds.length) return
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
