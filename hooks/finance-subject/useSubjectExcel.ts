import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { downloadFileByUrl, onlyMessage } from '@jetlinks-web/utils'
import { subjectTemplate, importSubjects } from '../../api/financeSubject'
import { excelErrorMessage } from '../../utils/archiveFiles'
import { validateImportFile } from '../../utils/archiveImport'
import { useProjectSwitchGuard } from '../project/useProjectContext'
export function useSubjectExcel(reload: () => void) {
  const { t } = useI18n()
  const busy = ref(false)
  useProjectSwitchGuard(() => !busy.value)
  async function template() {
    if (busy.value) return
    busy.value = true
    try {
      const blob = await subjectTemplate(),
        url = URL.createObjectURL(blob)
      try {
        downloadFileByUrl(url, t('Subject.title') + '-' + t('Subject.template'), 'xlsx')
      } finally {
        setTimeout(() => URL.revokeObjectURL(url), 1000)
      }
    } catch (cause) {
      onlyMessage(await excelErrorMessage(cause, t('Finance.failed')), 'error')
    } finally {
      busy.value = false
    }
  }
  async function upload(file: File) {
    if (busy.value) return false
    const invalid = validateImportFile(file)
    if (invalid) {
      onlyMessage(t('Archive.' + (invalid === 'format' ? 'importFormat' : 'importSize')), 'error')
      return false
    }
    busy.value = true
    try {
      const result = await importSubjects(file)
      onlyMessage(t('Subject.imported', result), 'success')
      reload()
    } catch (cause) {
      onlyMessage(await excelErrorMessage(cause, t('Finance.failed')), 'error')
    } finally {
      busy.value = false
    }
    return false
  }
  return { busy, template, upload }
}
