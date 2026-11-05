import { onMounted, onScopeDispose, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { onlyMessage } from '@jetlinks-web/utils'
import { useProjectContext, useProjectSwitchGuard } from '../project/useProjectContext'
import {
  getProjectCompanies,
  bindProjectCompany,
  defaultProjectCompany,
  unbindProjectCompany,
  type ProjectCompany
} from '../../api/finance'
import { requestErrorMessage } from '../../utils/requestError'
export const projectCompanyPermission = 'charging/FinanceCompany'
export function useProjectCompanies() {
  const { t } = useI18n()
  const context = useProjectContext()
  const rows = ref<ProjectCompany[]>([])
  const loading = ref(false)
  const failed = ref(false)
  const busy = ref(false)
  const picker = ref(false)
  let generation = 0
  let disposed = false
  const notify = (cause: unknown) => onlyMessage(requestErrorMessage(cause, t('Finance.failed')), 'error')
  async function reload() {
    const id = context.projectId.value
    const token = ++generation
    rows.value = []
    failed.value = false
    loading.value = !!id
    if (!id) return
    try {
      const value = await getProjectCompanies(id)
      if (!disposed && token === generation) rows.value = value
    } catch (cause) {
      if (!disposed && token === generation) {
        failed.value = true
        notify(cause)
      }
    } finally {
      if (token === generation) loading.value = false
    }
  }
  async function run(operation: () => Promise<unknown>, message: string) {
    if (busy.value || !context.projectId.value) return
    busy.value = true
    try {
      await operation()
      onlyMessage(message, 'success')
      picker.value = false
      await reload()
    } catch (cause) {
      notify(cause)
    } finally {
      busy.value = false
    }
  }
  const bind = (companyId: string, name: string) =>
    run(() => bindProjectCompany(context.projectId.value, companyId), t('Finance.boundSuccess', { name }))
  const setDefault = (row: ProjectCompany) =>
    run(
      () => defaultProjectCompany(context.projectId.value, row),
      t('Finance.defaultSuccess', { name: row.company.companyName })
    )
  const unbind = (row: ProjectCompany) =>
    run(
      () => unbindProjectCompany(context.projectId.value, row),
      t('Finance.unboundSuccess', { name: row.company.companyName })
    )
  useProjectSwitchGuard(() => !busy.value && !picker.value)
  watch(
    context.projectId,
    () => {
      picker.value = false
      void reload()
    },
    { immediate: true }
  )
  onMounted(() => {
    void context.refresh().catch(notify)
  })
  onScopeDispose(() => {
    disposed = true
    generation++
  })
  return {
    projectId: context.projectId,
    rows,
    loading,
    failed,
    busy,
    picker,
    reload,
    bind,
    setDefault,
    unbind
  }
}
