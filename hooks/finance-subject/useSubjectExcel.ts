import { ref, shallowRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { downloadFileByUrl, onlyMessage } from '@jetlinks-web/utils'
import { subjectTemplate, importSubjects } from '../../api/financeSubject'
import { excelErrorMessage } from '../../utils/archiveFiles'
import { validateImportFile } from '../../utils/archiveImport'
import { useProjectSwitchGuard } from '../project/useProjectContext'
export function useSubjectExcel(reload: () => void) {
  const { t } = useI18n()
  const busy = ref(false)
  const importOpen = ref(false)
  const file = shallowRef<File>()
  useProjectSwitchGuard(() => !busy.value && !importOpen.value)
  function openImport() {
    if (busy.value) return
    file.value = undefined
    importOpen.value = true
  }
  function closeImport() {
    if (busy.value) return
    importOpen.value = false
    file.value = undefined
  }
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
  function chooseFile(value: File) {
    if (busy.value) return false
    const invalid = validateImportFile(value)
    if (invalid) {
      onlyMessage(t('Archive.' + (invalid === 'format' ? 'importFormat' : 'importSize')), 'error')
      return false
    }
    file.value = value
    return false
  }
  async function submitImport() {
    if (busy.value || !importOpen.value || !file.value) return
    busy.value = true
    try {
      const result = await importSubjects(file.value)
      onlyMessage(t('Subject.imported', result), 'success')
      importOpen.value = false
      file.value = undefined
      reload()
    } catch (cause) {
      onlyMessage(await excelErrorMessage(cause, t('Finance.failed')), 'error')
    } finally {
      busy.value = false
    }
  }
  return { busy, importOpen, file, openImport, closeImport, template, chooseFile, submitImport }
}
