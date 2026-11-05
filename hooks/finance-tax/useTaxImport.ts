import { ref, shallowRef, watch, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { onlyMessage } from '@jetlinks-web/utils'
import { importTaxItems } from '../../api/financeTax'
import { validateImportFile } from '../../utils/archiveImport'
import { excelErrorMessage } from '../../utils/archiveFiles'

/** 选文件只做本地校验，用户确认后才提交；失败保留文件以便重试。 */
export function useTaxImport(
  projectId: Ref<string>,
  companyId: Ref<string | undefined>,
  busy: Ref<boolean>,
  reload: () => void
) {
  const { t } = useI18n()
  const importOpen = ref(false)
  const importCompanyId = ref<string>()
  const importFile = shallowRef<File>()
  const startImport = () => {
    importCompanyId.value = companyId.value
    importFile.value = undefined
    importOpen.value = true
  }
  const closeImport = () => {
    if (!busy.value) importOpen.value = false
  }
  const chooseFile = (file: File) => {
    const invalid = validateImportFile(file)
    if (invalid)
      onlyMessage(t('Archive.' + (invalid === 'format' ? 'importFormat' : 'importSize')), 'warning')
    else importFile.value = file
    return false
  }
  async function upload(file: File, targetCompanyId = companyId.value) {
    if (busy.value) return false
    if (!projectId.value || !targetCompanyId) {
      onlyMessage(t('FinanceTax.chooseCompany'), 'warning')
      return false
    }
    const invalid = validateImportFile(file)
    if (invalid) {
      onlyMessage(t('Archive.' + (invalid === 'format' ? 'importFormat' : 'importSize')), 'warning')
      return false
    }
    busy.value = true
    try {
      const result = await importTaxItems(projectId.value, targetCompanyId, file)
      onlyMessage(t('FinanceTax.imported', { count: result.count }), 'success')
      importOpen.value = false
      importFile.value = undefined
      reload()
    } catch (cause) {
      onlyMessage(await excelErrorMessage(cause, t('FinanceTax.failed')), 'error')
    } finally {
      busy.value = false
    }
    return false
  }
  async function submitImport() {
    if (!importCompanyId.value) {
      onlyMessage(t('FinanceTax.chooseCompany'), 'warning')
      return
    }
    if (!importFile.value) {
      onlyMessage(t('FinanceTax.chooseFile'), 'warning')
      return
    }
    await upload(importFile.value, importCompanyId.value)
  }
  watch(projectId, () => {
    importOpen.value = false
    importCompanyId.value = undefined
    importFile.value = undefined
  })
  return {
    importOpen,
    importCompanyId,
    importFile,
    startImport,
    closeImport,
    chooseFile,
    submitImport,
    upload
  }
}
