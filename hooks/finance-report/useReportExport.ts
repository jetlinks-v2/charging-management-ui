import { onScopeDispose, ref, watch, type Ref } from 'vue'
import { downloadFileByUrl, onlyMessage } from '@jetlinks-web/utils'
import { excelErrorMessage } from '../../utils/archiveFiles'

/** 文件导出冻结已应用条件；项目变化或销毁后丢弃迟到结果，并释放PDF预览资源。 */
export function useReportExport<Input>(options: {
  projectId: Ref<string | undefined>
  enabled: () => boolean
  input: () => Input
  title: () => string
  fallback: () => string
  request: (input: Input, format: 'excel' | 'pdf') => Promise<Blob>
}) {
  const exporting = ref(false),
    previewUrl = ref(''),
    previewOpen = ref(false)
  let generation = 0,
    disposed = false
  function closePreview() {
    previewOpen.value = false
    if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
    previewUrl.value = ''
  }
  async function exportRows(format: 'excel' | 'pdf', preview = false) {
    if (!options.enabled() || exporting.value) return
    const input = options.input(),
      token = ++generation
    exporting.value = true
    try {
      const blob = await options.request(input, format)
      if (disposed || token !== generation) return
      const url = URL.createObjectURL(blob)
      if (preview) {
        closePreview()
        previewUrl.value = url
        previewOpen.value = true
      } else {
        try {
          downloadFileByUrl(url, options.title(), format === 'excel' ? 'xlsx' : 'pdf')
        } finally {
          setTimeout(() => URL.revokeObjectURL(url), 1000)
        }
      }
    } catch (cause) {
      const message = await excelErrorMessage(cause, options.fallback())
      if (!disposed && token === generation) onlyMessage(message, 'error')
    } finally {
      if (!disposed && token === generation) exporting.value = false
    }
  }
  watch(
    options.projectId,
    () => {
      ++generation
      exporting.value = false
      closePreview()
    },
    { flush: 'sync' }
  )
  onScopeDispose(() => {
    disposed = true
    ++generation
    closePreview()
  })
  return { exporting, previewUrl, previewOpen, closePreview, exportRows }
}
