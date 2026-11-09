import { computed, onScopeDispose, ref, watch } from 'vue'
import dayjs from 'dayjs'
import { useI18n } from 'vue-i18n'
import { onlyMessage } from '@jetlinks-web/utils'
import { useProjectContext } from '../project/useProjectContext'
import { useReportExport } from './useReportExport'
import {
  queryAnalysis,
  exportAnalysis,
  type AnalysisKind,
  type AnalysisInput,
  type AnalysisResult,
  type AnalysisRow
} from '../../api/financeAnalysis'
import { analysisConfig } from '../../utils/analysisReport'
import { requestErrorMessage } from '../../utils/requestError'
import type { Query } from '../../api/archive'
/** 已应用查询作为分页和导出的唯一快照；项目切换后丢弃旧请求及旧下钻条件。 */
export function useAnalysisReport(kind: AnalysisKind) {
  const { t } = useI18n(),
    context = useProjectContext(),
    config = analysisConfig[kind]
  const defaults = (): AnalysisInput => ({
    projectIds: [...context.reportProjectIds.value],
    spaceIds: [],
    customerIds: [],
    subjectIds: [],
    startDate: kind === 'arrears' ? undefined : dayjs().startOf('month').format('YYYY-MM-DD'),
    endDate: kind === 'monthly' ? dayjs().endOf('month').format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'),
    groupBy: config.groups[0],
    pageIndex: 0,
    pageSize: 12
  })
  const copy = (input: AnalysisInput): AnalysisInput => ({
    ...input,
    projectIds: [...input.projectIds],
    spaceIds: [...input.spaceIds],
    customerIds: [...input.customerIds],
    subjectIds: [...input.subjectIds]
  })
  const active = ref(defaults()),
    result = ref<AnalysisResult>(),
    failed = ref(false),
    loading = ref(false),
    revision = ref(0),
    parent = ref<AnalysisInput>(),
    detail = ref<AnalysisRow>()
  const ready = computed(() => active.value.projectIds.length > 0)
  let generation = 0,
    disposed = false
  const exports = useReportExport({
    projectId: computed(() => context.reportProjectIds.value.join(',')),
    enabled: () => ready.value && !loading.value && !failed.value,
    input: () => copy(active.value),
    title: () => t('Analysis.' + kind),
    fallback: () => t('Finance.failed'),
    request: (i, f) => exportAnalysis(kind, i, f)
  })
  const invalidate = () => {
    ++generation
    result.value = undefined
    failed.value = false
    loading.value = false
    revision.value++
  }
  function apply(values: Record<string, string | undefined>) {
    if (exports.exporting.value) return
    parent.value = undefined
    active.value = { ...defaults(), ...values, groupBy: active.value.groupBy }
    invalidate()
  }
  function group(groupBy: string) {
    if (exports.exporting.value) return
    parent.value = undefined
    active.value = { ...copy(active.value), groupBy, pageIndex: 0 }
    invalidate()
  }
  function drill(row: AnalysisRow, groupBy?: string) {
    if (exports.exporting.value || ['DETAIL', 'PERIOD'].includes(active.value.groupBy)) return
    const i = copy(active.value),
      g = groupBy || i.groupBy
    if (row.projectId) i.projectIds = [String(row.projectId)]
    if (g === 'SUBJECT' && row.subjectId) i.subjectIds = [String(row.subjectId)]
    else if (g === 'SPACE' && row.spaceId) i.spaceIds = [String(row.spaceId)]
    else if (g === 'CUSTOMER' && row.customerId) i.customerIds = [String(row.customerId)]
    else if (g === 'TYPE') i.type = String(row.type)
    else if (g === 'AGE') i.ageBucket = String(row.age)
    else if (g === 'OPERATION') i.operation = String(row.operation)
    else if (g === 'ACTIVITY') i.activityId = String(row.activityId)
    else if (g === 'MONTH') {
      const start = dayjs(String(row.month) + '-01')
      const monthStart = start.format('YYYY-MM-DD'),
        monthEnd = start.endOf('month').format('YYYY-MM-DD')
      i.startDate = i.startDate && i.startDate > monthStart ? i.startDate : monthStart
      i.endDate = i.endDate < monthEnd ? i.endDate : monthEnd
    }
    parent.value = copy(active.value)
    active.value = { ...i, groupBy: 'DETAIL', pageIndex: 0 }
    invalidate()
  }
  function back() {
    if (!parent.value || exports.exporting.value) return
    active.value = copy(parent.value)
    parent.value = undefined
    invalidate()
  }
  async function request(q: Query, options?: { signal?: AbortSignal }) {
    const token = ++generation,
      input = { ...copy(active.value), pageIndex: q.pageIndex || 0, pageSize: q.pageSize || 12 }
    if (!ready.value) return { success: true, result: { data: [], total: 0, pageIndex: 0, pageSize: 12 } }
    loading.value = true
    failed.value = false
    try {
      const value = await queryAnalysis(kind, input, options?.signal)
      if (!disposed && token === generation) result.value = value
      return { success: true, result: value.page }
    } catch (error) {
      if (!disposed && token === generation) {
        failed.value = true
        result.value = undefined
        onlyMessage(requestErrorMessage(error, t('Finance.failed')), 'error')
      }
      throw error
    } finally {
      if (!disposed && token === generation) loading.value = false
    }
  }
  watch(
    context.reportProjectIds,
    () => {
      active.value = defaults()
      parent.value = undefined
      detail.value = undefined
      invalidate()
    },
    { deep: true, flush: 'sync' }
  )
  onScopeDispose(() => {
    disposed = true
    ++generation
  })
  return {
    kind,
    config,
    active,
    result,
    failed,
    loading,
    ready,
    revision,
    parent,
    detail,
    apply,
    group,
    drill,
    back,
    request,
    ...exports
  }
}
