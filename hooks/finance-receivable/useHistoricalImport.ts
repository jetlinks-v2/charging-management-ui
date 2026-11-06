import { computed, onScopeDispose, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { downloadFileByUrl, onlyMessage } from '@jetlinks-web/utils'
import {
  historicalTemplate,
  importHistorical,
  queryHistoricalImports,
  type HistoricalImportRecord
} from '../../api/financeReceivable'
import type { Query } from '../../api/archive'
import { excelErrorMessage } from '../../utils/archiveFiles'
import { validateImportFile } from '../../utils/archiveImport'
import { requestErrorMessage } from '../../utils/requestError'
import { useProjectSwitchGuard } from '../project/useProjectContext'

/** 项目在导入期间锁定；失败批次留在记录中，不能当作成功刷新或关闭窗口。 */
export function useHistoricalImport(props: { projectId: string; projectName?: string }, saved: () => void) {
  const { t } = useI18n()
  const open = ref(false),
    historyOpen = ref(false),
    busy = ref(false)
  const historyStatus = ref('ALL'),
    historyReadonly = ref(true)
  const table = ref<{ reload: () => void }>()
  const selected = ref<HistoricalImportRecord>()
  const params = computed(() => ({ projectId: props.projectId, open: historyOpen.value }))
  let disposed = false,
    generation = 0
  const notify = (error: unknown) => onlyMessage(requestErrorMessage(error, t('Finance.failed')), 'error')
  async function template() {
    if (!props.projectId || busy.value) return
    busy.value = true
    const project = props.projectId,
      token = generation
    try {
      const file = await historicalTemplate(project)
      if (disposed || token !== generation) return
      const url = URL.createObjectURL(file)
      try {
        downloadFileByUrl(url, `${props.projectName || project}-${t('Historical.title')}`, 'xlsx')
      } finally {
        setTimeout(() => URL.revokeObjectURL(url), 1000)
      }
    } catch (error) {
      if (!disposed && token === generation) onlyMessage(await excelErrorMessage(error, t('Finance.failed')), 'error')
    } finally {
      if (!disposed && token === generation) busy.value = false
    }
  }
  async function upload(file: File) {
    if (!props.projectId || busy.value) return
    const invalid = validateImportFile(file)
    if (invalid) {
      onlyMessage(t('Archive.' + (invalid === 'format' ? 'importFormat' : 'importSize')), 'error')
      return
    }
    busy.value = true
    const token = generation,
      project = props.projectId
    try {
      const result = await importHistorical(project, file)
      if (disposed || token !== generation) return
      table.value?.reload()
      if (result.status === 'PENDING') {
        onlyMessage(t('HistoricalAudit.staged', { count: result.totalCount }), 'success')
        open.value = false
        historyStatus.value = 'PENDING'
        historyReadonly.value = true
        historyOpen.value = true
      } else if (result.status === 'SUCCESS') {
        onlyMessage(t('Historical.succeeded', { count: result.successCount }), 'success')
        open.value = false
        saved()
      } else if (result.status === 'FAILED') onlyMessage(result.errorMessage || t('Historical.failed'), 'error')
      else onlyMessage(t('Historical.processing'), 'warning')
    } catch (error) {
      if (!disposed && token === generation) notify(error)
    } finally {
      if (!disposed && token === generation) busy.value = false
    }
  }
  function showHistory(status: string, readonly = true) {
    historyReadonly.value = readonly
    historyStatus.value = status
    historyOpen.value = true
  }
  function request(query: Query, options?: { signal: AbortSignal }) {
    if (!props.projectId || !historyOpen.value)
      return Promise.resolve({ success: true, result: { data: [], total: 0 } })
    return queryHistoricalImports(
      props.projectId,
      { terms: [], pageIndex: query.pageIndex, pageSize: query.pageSize },
      options?.signal
    )
  }
  watch(
    () => props.projectId,
    () => {
      ++generation
      open.value = false
      historyOpen.value = false
      selected.value = undefined
      busy.value = false
    }
  )
  useProjectSwitchGuard(() => !open.value && !busy.value && !historyOpen.value)
  onScopeDispose(() => {
    disposed = true
    ++generation
  })
  return {
    open,
    historyOpen,
    historyStatus,
    historyReadonly,
    showHistory,
    busy,
    table,
    params,
    selected,
    template,
    upload,
    request,
    notify
  }
}
