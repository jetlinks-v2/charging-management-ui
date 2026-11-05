import { computed, onScopeDispose, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { onlyMessage } from '@jetlinks-web/utils'
import {
  getCompany,
  queryCompanies,
  saveCompany,
  deleteCompany,
  type Company,
  type CompanyDetail,
  type CompanyInput
} from '../../api/finance'
import type { Query } from '../../api/archive'
import { requestErrorMessage } from '../../utils/requestError'
export const companyPermission = 'charging/FinanceCompany'
export function useCompanyCatalog(loadDetail = getCompany, persist = saveCompany) {
  const { t } = useI18n()
  const table = ref<{ reload: () => void }>()
  const terms = ref<Query['terms']>([])
  const open = ref(false)
  const loading = ref(false)
  const failed = ref(false)
  const saving = ref(false)
  const readOnly = ref(true)
  const detail = ref<CompanyDetail>()
  const activeId = ref<string>()
  let generation = 0
  let disposed = false
  const params = computed(() => ({ terms: terms.value, sorts: [{ name: 'createTime', order: 'desc' }] }))
  const reload = () => table.value?.reload()
  const notify = (cause: unknown) => onlyMessage(requestErrorMessage(cause, t('Finance.failed')), 'error')
  async function select(id?: string, view = true) {
    const token = ++generation
    activeId.value = id
    open.value = true
    readOnly.value = view
    detail.value = undefined
    failed.value = false
    loading.value = !!id
    if (!id) return
    try {
      const value = await loadDetail(id)
      if (!disposed && token === generation) detail.value = value
    } catch (cause) {
      if (!disposed && token === generation) {
        failed.value = true
        notify(cause)
      }
    } finally {
      if (token === generation) loading.value = false
    }
  }
  function close() {
    if (saving.value) return
    generation++
    open.value = false
    detail.value = undefined
  }
  async function save(input: CompanyInput) {
    if (saving.value || readOnly.value || loading.value || failed.value) return
    saving.value = true
    try {
      await persist(activeId.value, input)
      onlyMessage(t('Finance.saved', { name: input.companyName }), 'success')
      open.value = false
      reload()
    } catch (cause) {
      notify(cause)
    } finally {
      saving.value = false
    }
  }
  async function remove(row: Company) {
    try {
      await deleteCompany(row)
      onlyMessage(t('Finance.deleted', { name: row.companyName }), 'success')
      reload()
    } catch (cause) {
      notify(cause)
    }
  }
  async function request(query: Query, context?: { signal: AbortSignal }) {
    return queryCompanies(query, context?.signal)
  }
  onScopeDispose(() => {
    disposed = true
    generation++
  })
  return {
    table,
    terms,
    params,
    open,
    loading,
    failed,
    saving,
    readOnly,
    detail,
    select,
    close,
    save,
    remove,
    request,
    reload,
    retry: () => select(activeId.value, readOnly.value)
  }
}
