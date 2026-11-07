import { computed, onScopeDispose, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { onlyMessage } from '@jetlinks-web/utils'
import {
  queryHistoricalImports,
  retryHistoricalImport,
  queryHistoricalImportLines,
  decideHistoricalImports,
  decideHistoricalImportLines,
  type HistoricalImportRecord,
  type HistoricalImportLine
} from '../../api/financeReceivable'
import type { Query, QueryTerm } from '../../api/archive'
import { useProjectSwitchGuard } from '../project/useProjectContext'
import { requestErrorMessage } from '../../utils/requestError'

export interface ImportAuditAdapter {
  query: typeof queryHistoricalImports
  lines: typeof queryHistoricalImportLines
  decide: typeof decideHistoricalImports
  decideLines: typeof decideHistoricalImportLines
  retry?: (project: string, record: string) => Promise<unknown>
  maxBatches?: number
}

export function useHistoricalAudit(
  props: { open: boolean; projectId: string; initialStatus: string; readonly?: boolean },
  saved: () => void,
  adapter: ImportAuditAdapter = {
    query: queryHistoricalImports,
    retry: retryHistoricalImport,
    lines: queryHistoricalImportLines,
    decide: decideHistoricalImports,
    decideLines: decideHistoricalImportLines
  }
) {
  const { t } = useI18n()
  const readonly = computed(() => !!props.readonly)
  const maxBatches = adapter.maxBatches || 20
  const editing = ref<HistoricalImportLine>()
  const status = ref('PENDING'),
    keyword = ref(''),
    searchField = ref('fileName'),
    appliedSearchField = ref('fileName'),
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
    keyword: searchKeyword.value,
    searchField: appliedSearchField.value
  }))
  const lineParams = computed(() => ({
    record: record.value?.id,
    project: props.projectId,
    status: lineStatus.value,
    terms: lineTerms.value
  }))
  const notify = (error: unknown) => onlyMessage(requestErrorMessage(error, t('Finance.failed')), 'error')
  let timer: ReturnType<typeof setTimeout> | undefined
  let pollAbort: AbortController | undefined
  const active = new Set<string>()
  const working = (row: HistoricalImportRecord) => ['PROCESSING', 'REVIEWING'].includes(row.status)
  function stopPolling() {
    if (timer) clearTimeout(timer)
    timer = undefined
    pollAbort?.abort()
    active.clear()
  }
  function track(rows: HistoricalImportRecord[]) {
    for (const row of rows) {
      if (working(row)) active.add(row.id)
      else active.delete(row.id)
    }
    if (active.size && !timer && props.open && !disposed) timer = setTimeout(poll, 2500)
  }
  async function poll() {
    timer = undefined
    if (!props.open || disposed || !active.size) return
    const token = generation
    pollAbort = new AbortController()
    try {
      const value = await adapter.query(
        props.projectId,
        { terms: [{ column: 'id', termType: 'in', value: [...active] }], pageIndex: 0, pageSize: 100 },
        pollAbort.signal
      )
      if (disposed || token !== generation) return
      const completed = value.result.data.some((row) => active.has(row.id) && !working(row))
      if (record.value) {
        const updated = value.result.data.find((row) => row.id === record.value?.id)
        if (updated) record.value = updated
      }
      track(value.result.data)
      // 选择、编辑、确认期间不重载表格，避免刷新丢失用户勾选。
      if (!editing.value && !decision.value && !busy.value && !selected.value.length && !selectedLines.value.length) {
        table.value?.reload()
        if (record.value) lineTable.value?.reload()
      }
      if (completed) saved()
    } catch (error) {
      if (disposed || token !== generation) return
      notify(error)
    } finally {
      if (!disposed && token === generation && props.open && active.size && !timer) timer = setTimeout(poll, 5000)
    }
  }
  async function retry(row: HistoricalImportRecord) {
    if (busy.value || row.status !== 'FAILED' || !adapter.retry) return
    const token = generation
    busy.value = true
    try {
      await adapter.retry(props.projectId, row.id)
      if (disposed || token !== generation) return
      onlyMessage(t('Historical.queued'), 'success')
      active.add(row.id)
      track([])
      table.value?.reload()
    } catch (error) {
      if (!disposed && token === generation) notify(error)
    } finally {
      if (!disposed && token === generation) busy.value = false
    }
  }
  function request(query: Query, config?: { signal: AbortSignal }) {
    selected.value = []
    if (!props.open || !props.projectId) return Promise.resolve({ success: true, result: { data: [], total: 0 } })
    const terms: QueryTerm[] = []
    if (status.value !== 'ALL')
      terms.push({
        column: 'status',
        termType: status.value === 'APPROVED' ? 'in' : 'eq',
        value:
          status.value === 'APPROVED'
            ? ['APPROVED', 'SUCCESS', ...(adapter.maxBatches ? ['COMPLETED'] : [])]
            : status.value
      })
    if (searchKeyword.value)
      terms.push({ column: appliedSearchField.value, termType: 'like', value: '%' + searchKeyword.value + '%' })
    const token = generation
    return adapter
      .query(props.projectId, { terms, pageIndex: query.pageIndex, pageSize: query.pageSize }, config?.signal)
      .then((value) => {
        if (props.open && !disposed && token === generation) track(value.result.data)
        return value
      })
  }
  function searchRecords() {
    appliedSearchField.value = searchField.value
    searchKeyword.value = keyword.value.trim()
    selected.value = []
  }
  function resetRecords() {
    searchField.value = 'fileName'
    appliedSearchField.value = 'fileName'
    keyword.value = ''
    searchKeyword.value = ''
    selected.value = []
  }
  function requestLines(query: Query, config?: { signal: AbortSignal }) {
    selectedLines.value = []
    if (!record.value) return Promise.resolve({ success: true, result: { data: [], total: 0 } })
    const terms = [...lineTerms.value]
    if (lineStatus.value !== 'ALL') terms.push({ column: 'status', termType: 'eq', value: lineStatus.value })
    return adapter.lines(
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
  function resetLines() {
    house.value = ''
    customer.value = ''
    lineStatus.value = 'ALL'
    searchLines()
  }
  function start(action: 'approve' | 'reject', records = selected.value, lines?: HistoricalImportLine[]) {
    if (
      readonly.value ||
      busy.value ||
      !!editing.value ||
      !records.length ||
      records.some((row) => row.status !== 'PENDING') ||
      records.length > maxBatches ||
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
    if (readonly.value || !target || busy.value || !reason.value.trim()) return
    busy.value = true
    try {
      const results = target.lines
        ? [await adapter.decideLines(project, target.records[0], target.action, target.lines, reason.value.trim())]
        : await adapter.decide(project, target.action, target.records, reason.value.trim())
      if (disposed || token !== generation) return
      if (record.value) record.value = results.find((row) => row.id === record.value?.id) || record.value
      decision.value = undefined
      selected.value = []
      selectedLines.value = []
      track(results)
      onlyMessage(t(results.some(working) ? 'HistoricalAudit.queued' : 'HistoricalAudit.saved'), 'success')
      table.value?.reload()
      lineTable.value?.reload()
      if (!results.some(working)) saved()
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
      stopPolling()
      record.value = undefined
      editing.value = undefined
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
  useProjectSwitchGuard(() => !props.open && !busy.value && !editing.value)
  watch(status, () => {
    selected.value = []
  })
  onScopeDispose(() => {
    disposed = true
    stopPolling()
    ++generation
  })
  function editLine(line: HistoricalImportLine) {
    if (
      !readonly.value &&
      !busy.value &&
      !decision.value &&
      record.value?.status === 'PENDING' &&
      line.status === 'PENDING'
    )
      editing.value = line
  }
  function edited(value: { record: HistoricalImportRecord; line: HistoricalImportLine }) {
    record.value = value.record
    editing.value = undefined
    selected.value = []
    selectedLines.value = []
    table.value?.reload()
    lineTable.value?.reload()
  }
  return {
    readonly,
    retry,
    maxBatches,
    editing,
    editLine,
    edited,
    status,
    keyword,
    searchField,
    searchRecords,
    resetRecords,
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
    resetLines,
    start,
    submit
  }
}
