import { computed, onScopeDispose, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { onlyMessage } from '@jetlinks-web/utils'
import {
  queryHistoricalImports,
  queryHistoricalImportLines,
  decideHistoricalImports,
  decideHistoricalImportLines,
  type HistoricalImportRecord,
  type HistoricalImportLine
} from '../../api/financeReceivable'
import type { Query, QueryTerm } from '../../api/archive'
import { requestErrorMessage } from '../../utils/requestError'

export function useHistoricalAudit(
  props: { open: boolean; projectId: string; initialStatus: string },
  saved: () => void
) {
  const { t } = useI18n()
  const status = ref('PENDING'),
    keyword = ref(''),
    searchKeyword = ref('')
  const table = ref<{ reload: () => void }>(),
    lineTable = ref<{ reload: () => void }>()
  const selected = ref<HistoricalImportRecord[]>([]),
    selectedLines = ref<HistoricalImportLine[]>([])
  const record = ref<HistoricalImportRecord>()
  const lineStatus = ref('ALL'),
    house = ref(''),
    customer = ref('')
  const lineTerms = ref<QueryTerm[]>([])
  const decision = ref<{
    action: 'approve' | 'reject'
    records: Pick<HistoricalImportRecord, 'id' | 'version' | 'status' | 'fileName'>[]
    lines?: HistoricalImportLine[]
  }>()
  const reason = ref(''),
    busy = ref(false)
  let generation = 0,
    disposed = false
  const params = computed(() => ({
    project: props.projectId,
    open: props.open,
    status: status.value,
    keyword: searchKeyword.value
  }))
  const lineParams = computed(() => ({
    record: record.value?.id,
    project: props.projectId,
    status: lineStatus.value,
    terms: lineTerms.value
  }))
  const notify = (error: unknown) => onlyMessage(requestErrorMessage(error, t('Finance.failed')), 'error')
  function request(query: Query, config?: { signal: AbortSignal }) {
    selected.value = []
    if (!props.open || !props.projectId) return Promise.resolve({ success: true, result: { data: [], total: 0 } })
    const terms: QueryTerm[] = []
    if (status.value !== 'ALL')
      terms.push({
        column: 'status',
        termType: status.value === 'APPROVED' ? 'in' : 'eq',
        value: status.value === 'APPROVED' ? ['APPROVED', 'SUCCESS'] : status.value
      })
    if (searchKeyword.value)
      terms.push({ column: 'fileName', termType: 'like', value: '%' + searchKeyword.value + '%' })
    return queryHistoricalImports(
      props.projectId,
      { terms, pageIndex: query.pageIndex, pageSize: query.pageSize },
      config?.signal
    )
  }
  function requestLines(query: Query, config?: { signal: AbortSignal }) {
    selectedLines.value = []
    if (!record.value) return Promise.resolve({ success: true, result: { data: [], total: 0 } })
    const terms = [...lineTerms.value]
    if (lineStatus.value !== 'ALL') terms.push({ column: 'status', termType: 'eq', value: lineStatus.value })
    return queryHistoricalImportLines(
      props.projectId,
      record.value.id,
      { terms, pageIndex: query.pageIndex, pageSize: query.pageSize },
      config?.signal
    )
  }
  function showLines(row: HistoricalImportRecord) {
    record.value = row
    lineStatus.value = 'ALL'
    house.value = ''
    customer.value = ''
    lineTerms.value = []
    selectedLines.value = []
  }
  function searchLines() {
    // 名称检索使用后端明细快照列，不能只过滤当前页。
    lineTerms.value = [
      ...(house.value.trim() ? [{ column: 'fullName', termType: 'like', value: '%' + house.value.trim() + '%' }] : []),
      ...(customer.value.trim()
        ? [{ column: 'customerName', termType: 'like', value: '%' + customer.value.trim() + '%' }]
        : [])
    ]
  }
  function start(action: 'approve' | 'reject', records = selected.value, lines?: HistoricalImportLine[]) {
    if (
      busy.value ||
      !records.length ||
      records.some((row) => row.status !== 'PENDING') ||
      records.length > 100 ||
      (lines && (!lines.length || lines.length > 100 || lines.some((row) => row.status !== 'PENDING')))
    )
      return
    decision.value = {
      action,
      // 表格槽会附加列配置，确认只冻结审核身份，避免克隆框架 VNode 或响应式代理。
      records: records.map(({ id, version, status, fileName }) => ({ id, version, status, fileName })),
      lines: lines?.map((row) => ({ ...row }))
    }
    reason.value = ''
  }
  async function submit() {
    const target = decision.value,
      project = props.projectId,
      token = generation
    if (!target || busy.value || !reason.value.trim()) return
    busy.value = true
    try {
      const results = target.lines
        ? [
            await decideHistoricalImportLines(
              project,
              target.records[0],
              target.action,
              target.lines,
              reason.value.trim()
            )
          ]
        : await decideHistoricalImports(project, target.action, target.records, reason.value.trim())
      if (disposed || token !== generation) return
      if (record.value) record.value = results.find((row) => row.id === record.value?.id) || record.value
      decision.value = undefined
      selected.value = []
      selectedLines.value = []
      onlyMessage(t('HistoricalAudit.saved'), 'success')
      table.value?.reload()
      lineTable.value?.reload()
      saved()
    } catch (error) {
      if (!disposed && token === generation) notify(error)
    } finally {
      if (!disposed && token === generation) busy.value = false
    }
  }
  watch(
    () => [props.open, props.projectId],
    () => {
      ++generation
      record.value = undefined
      decision.value = undefined
      selected.value = []
      selectedLines.value = []
      status.value = props.initialStatus
      keyword.value = ''
      searchKeyword.value = ''
      busy.value = false
    },
    { immediate: true }
  )
  watch(status, () => {
    selected.value = []
  })
  onScopeDispose(() => {
    disposed = true
    ++generation
  })
  return {
    status,
    keyword,
    searchKeyword,
    table,
    lineTable,
    params,
    lineParams,
    selected,
    selectedLines,
    record,
    lineStatus,
    house,
    customer,
    decision,
    reason,
    busy,
    notify,
    request,
    requestLines,
    showLines,
    searchLines,
    start,
    submit
  }
}
