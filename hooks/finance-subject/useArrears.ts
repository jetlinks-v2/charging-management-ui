import { computed, onMounted, onScopeDispose, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { onlyMessage } from '@jetlinks-web/utils'
import {
  getArrears,
  getArrearsLevels,
  queryArrears,
  saveArrears,
  deleteArrears,
  type ArrearsConfig,
  type ArrearsInput,
  type DictionaryOption
} from '../../api/financeSubject'
import type { Query } from '../../api/archive'
import { requestErrorMessage } from '../../utils/requestError'
export const arrearsPermission = 'charging/FinanceArrears'
export function useArrears() {
  const { t } = useI18n()
  const table = ref<{ reload: () => void }>()
  const terms = ref<Query['terms']>([])
  const open = ref(false),
    loading = ref(false),
    failed = ref(false),
    saving = ref(false),
    readOnly = ref(true)
  const levels = ref<DictionaryOption[]>([])
  const activeId = ref<string>()
  const model = ref<ArrearsInput>({ name: '', remark: '', rules: [{ overdueDays: 1, levelCode: '' }] })
  const form = ref<{ validate: () => Promise<unknown> }>()
  const params = computed(() => ({ terms: terms.value, sorts: [{ name: 'modifyTime', order: 'desc' }] }))
  let generation = 0,
    disposed = false
  const notify = (cause: unknown) => onlyMessage(requestErrorMessage(cause, t('Finance.failed')), 'error')
  const reload = () => table.value?.reload()
  async function select(id?: string, view = true) {
    const token = ++generation
    open.value = true
    loading.value = !!id
    readOnly.value = view
    activeId.value = id
    failed.value = false
    model.value = { name: '', remark: '', rules: [{ overdueDays: 1, levelCode: '' }] }
    if (!id) return
    try {
      const value = await getArrears(id)
      if (!disposed && token === generation)
        model.value = { ...value.config, rules: value.rules.map((rule) => ({ ...rule })) }
    } catch (cause) {
      if (token === generation) {
        failed.value = true
        notify(cause)
      }
    } finally {
      if (token === generation) loading.value = false
    }
  }
  async function save() {
    if (saving.value || readOnly.value || loading.value || failed.value) return
    try {
      await form.value?.validate()
    } catch {
      return
    }
    if (
      !model.value.rules.length ||
      new Set(model.value.rules.map((rule) => rule.overdueDays)).size !== model.value.rules.length
    ) {
      onlyMessage(t('Subject.uniqueDays'), 'warning')
      return
    }
    saving.value = true
    try {
      await saveArrears(activeId.value, model.value)
      onlyMessage(t('Finance.saved', { name: model.value.name }), 'success')
      open.value = false
      reload()
    } catch (cause) {
      notify(cause)
    } finally {
      saving.value = false
    }
  }
  async function remove(row: ArrearsConfig) {
    try {
      await deleteArrears(row)
      onlyMessage(t('Finance.deleted', { name: row.name }), 'success')
      reload()
    } catch (cause) {
      notify(cause)
    }
  }
  function close() {
    if (!saving.value) {
      generation++
      open.value = false
    }
  }
  async function request(query: Query, context?: { signal: AbortSignal }) {
    return queryArrears(query, context?.signal)
  }
  onMounted(async () => {
    try {
      levels.value = await getArrearsLevels()
    } catch (cause) {
      notify(cause)
    }
  })
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
    model,
    form,
    levels,
    reload,
    select,
    save,
    remove,
    close,
    notify,
    request
  }
}
