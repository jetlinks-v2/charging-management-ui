import { computed, onMounted, onScopeDispose, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { onlyMessage } from '@jetlinks-web/utils'
import { useProjectContext, useProjectSwitchGuard } from '../project/useProjectContext'
import type { Query } from '../../api/archive'
import {
  getRecorded,
  getRecordedOptions,
  queryRecorded,
  createRecorded,
  updateRecorded,
  deleteRecorded,
  type RecordedDetail,
  type RecordedInput,
  type RecordedRow,
  type RecordedDictionaryOption,
  type RecordedCompanyOption,
  type RecordedBankOption
} from '../../api/financeRecorded'
import { requestErrorMessage } from '../../utils/requestError'
export const recordedPermission = 'charging/FinanceCompany'
export function useRecorded() {
  const { t } = useI18n()
  const context = useProjectContext()
  const table = ref<{ reload: () => void }>()
  const terms = ref<Query['terms']>([])
  const open = ref(false),
    loading = ref(false),
    saving = ref(false),
    readOnly = ref(true),
    failed = ref(false)
  const detail = ref<RecordedDetail>()
  const activeId = ref<string>()
  const companies = ref<RecordedCompanyOption[]>([]),
    banks = ref<RecordedBankOption[]>([])
  const sources = ref<RecordedDictionaryOption[]>([]),
    payments = ref<RecordedDictionaryOption[]>([])
  const optionLoading = ref(false),
    optionsReady = ref(false)
  let generation = 0,
    optionGeneration = 0,
    disposed = false
  const notify = (cause: unknown) => onlyMessage(requestErrorMessage(cause, t('Finance.failed')), 'error')
  const params = computed(() => ({
    terms: terms.value,
    projectId: context.projectId.value,
    sorts: [{ name: 'createTime', order: 'desc' }]
  }))
  const reload = () => table.value?.reload()
  async function loadOptions() {
    const projectId = context.projectId.value,
      token = ++optionGeneration
    optionsReady.value = false
    optionLoading.value = true
    companies.value = []
    banks.value = []
    sources.value = []
    payments.value = []
    try {
      const options = await getRecordedOptions(projectId)
      if (disposed || token !== optionGeneration) return
      companies.value = options.companies
      sources.value = options.sources
      payments.value = options.payments
      optionsReady.value = true
    } catch (cause) {
      if (!disposed && token === optionGeneration) notify(cause)
    } finally {
      if (token === optionGeneration) optionLoading.value = false
    }
  }
  async function loadBanks(companyId: string, bankId?: string) {
    banks.value = companies.value.find((row) => row.id === companyId)?.banks || []
    return banks.value.some((bank) => bank.id === bankId) ? bankId : undefined
  }
  async function select(id?: string, view = true) {
    const token = ++generation
    activeId.value = id
    readOnly.value = view
    detail.value = undefined
    failed.value = false
    open.value = true
    loading.value = !!id
    if (!view) await loadOptions()
    if (!id || token !== generation) return
    try {
      const value = await getRecorded(context.projectId.value, id)
      if (!disposed && token === generation) detail.value = value
    } catch (cause) {
      if (!disposed && token === generation) {
        failed.value = true
        open.value = false
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
  async function save(input: RecordedInput) {
    if (saving.value || readOnly.value || loading.value || failed.value || !optionsReady.value) return
    saving.value = true
    try {
      if (activeId.value) {
        await updateRecorded(context.projectId.value, activeId.value, input)
        onlyMessage(t('Recorded.updated'), 'success')
      } else {
        const result = await createRecorded(context.projectId.value, input)
        onlyMessage(
          t('Recorded.created', { count: result.created.length, skipped: result.skipped.length }),
          result.skipped.length ? 'warning' : 'success'
        )
      }
      open.value = false
      generation++
      reload()
    } catch (cause) {
      notify(cause)
    } finally {
      saving.value = false
    }
  }
  async function remove(row: RecordedRow) {
    if (saving.value) return
    saving.value = true
    try {
      await deleteRecorded(context.projectId.value, row)
      onlyMessage(t('Recorded.deleted'), 'success')
      reload()
    } catch (cause) {
      notify(cause)
    } finally {
      saving.value = false
    }
  }
  const request = (query: Query, extra?: { signal: AbortSignal }) =>
    queryRecorded(context.projectId.value, query, extra?.signal)
  useProjectSwitchGuard(() => !saving.value && !open.value)
  watch(context.projectId, () => {
    generation++
    optionGeneration++
    open.value = false
    detail.value = undefined
    reload()
  })
  onMounted(() => {
    void context.refresh().catch(notify)
  })
  onScopeDispose(() => {
    disposed = true
    generation++
    optionGeneration++
  })
  return {
    projectId: context.projectId,
    table,
    terms,
    params,
    open,
    loading,
    saving,
    failed,
    readOnly,
    detail,
    companies,
    banks,
    sources,
    payments,
    optionLoading,
    optionsReady,
    select,
    close,
    save,
    remove,
    request,
    reload,
    loadBanks,
    loadOptions,
    retry: () => select(activeId.value, readOnly.value)
  }
}
