import { onScopeDispose, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { downloadFileByUrl, onlyMessage } from '@jetlinks-web/utils'
import {
  collectionImportTemplate,
  stageCollectionImport,
  type CollectionImportKind
} from '../../api/financeCollectionImport'
import { validateImportFile } from '../../utils/archiveImport'
import { excelErrorMessage } from '../../utils/archiveFiles'
import { requestErrorMessage } from '../../utils/requestError'
import { useProjectSwitchGuard } from '../project/useProjectContext'

/** 整文件由服务器校验后事务暂存；审批前不刷新正式收款或资金余额。 */
export function useCollectionImport(props: { projectId: string; projectName: string; kind: CollectionImportKind }) {
  const { t } = useI18n(),
    open = ref(false),
    historyOpen = ref(false),
    readonly = ref(true),
    status = ref('ALL'),
    busy = ref(false)
  let generation = 0,
    disposed = false
  const notify = (error: unknown) => onlyMessage(requestErrorMessage(error, t('Finance.failed')), 'error')
  function history(audit = false) {
    readonly.value = !audit
    status.value = audit ? 'PENDING' : 'ALL'
    historyOpen.value = true
  }
  async function template() {
    if (!props.projectId || busy.value) return
    const token = generation
    busy.value = true
    try {
      const file = await collectionImportTemplate(props.projectId, props.kind)
      if (disposed || token !== generation) return
      const url = URL.createObjectURL(file)
      try {
        downloadFileByUrl(url, `${props.projectName}-${t('CollectionImport.kinds.' + props.kind)}`, 'xlsx')
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
    const token = generation
    busy.value = true
    try {
      const result = await stageCollectionImport(props.projectId, props.kind, file)
      if (disposed || token !== generation) return
      if (result.status === 'PENDING') {
        onlyMessage(t('HistoricalAudit.staged', { count: result.totalCount }), 'success')
        open.value = false
        history(false)
        status.value = 'PENDING'
      } else if (result.status === 'FAILED') onlyMessage(result.errorMessage || t('Historical.failed'), 'error')
      else onlyMessage(t('Historical.processing'), 'warning')
    } catch (error) {
      if (!disposed && token === generation) notify(error)
    } finally {
      if (!disposed && token === generation) busy.value = false
    }
  }
  watch(
    () => [props.projectId, props.kind],
    () => {
      ++generation
      open.value = false
      historyOpen.value = false
      busy.value = false
    }
  )
  useProjectSwitchGuard(() => !open.value && !historyOpen.value && !busy.value)
  onScopeDispose(() => {
    disposed = true
    ++generation
  })
  return { t, open, historyOpen, readonly, status, busy, history, template, upload }
}
