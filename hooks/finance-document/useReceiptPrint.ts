import { onScopeDispose, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { onlyMessage } from '@jetlinks-web/utils'
import { getReceiptPdf, type DocumentRecord } from '../../api/financeDocument'
import { excelErrorMessage } from '../../utils/archiveFiles'

/** 收据预览只持有本次授权Blob；切换票据、关闭或卸载后释放，不缓存永久下载地址。 */
export function useReceiptPrint(
  project: () => string,
  document: () => DocumentRecord,
  urls: Pick<typeof URL, 'createObjectURL' | 'revokeObjectURL'> = URL
) {
  const { t } = useI18n()
  const open = ref(false),
    busy = ref(false),
    url = ref('')
  let generation = 0,
    disposed = false
  function close() {
    ++generation
    open.value = false
    busy.value = false
    if (url.value) urls.revokeObjectURL(url.value)
    url.value = ''
  }
  async function show() {
    if (disposed || busy.value || !project() || document().documentType !== 'RECEIPT') return
    close()
    const token = ++generation
    open.value = true
    busy.value = true
    try {
      const blob = await getReceiptPdf(project(), document().id)
      if (!disposed && token === generation) url.value = urls.createObjectURL(blob)
    } catch (cause) {
      const message = await excelErrorMessage(cause, t('Document.printFailed'))
      if (!disposed && token === generation) {
        open.value = false
        onlyMessage(message, 'error')
      }
    } finally {
      if (!disposed && token === generation) busy.value = false
    }
  }
  watch(() => [project(), document().id, document().version], close)
  onScopeDispose(() => {
    disposed = true
    close()
  })
  return { open, busy, url, show, close }
}
