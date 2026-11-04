import { ref, watch, onScopeDispose } from 'vue'
import { useI18n } from 'vue-i18n'
import { onlyMessage } from '@jetlinks-web/utils'
import {
  getFormulaVariables,
  saveFormulaVariable,
  deleteFormulaVariable,
  type FormulaVariable,
  type VariableInput
} from '../../api/financeStandard'
import { requestErrorMessage } from '../../utils/requestError'
export function useFormulaVariables(props: { open: boolean; projectId: string }, changed: () => void) {
  const { t } = useI18n(),
    rows = ref<FormulaVariable[]>([]),
    loading = ref(false),
    saving = ref(false),
    editorOpen = ref(false),
    current = ref<FormulaVariable>()
  const defaults = (): VariableInput => ({
    variableCode: '',
    variableName: '',
    description: '',
    sort: 0,
    enabled: true
  })
  const model = ref<VariableInput>(defaults())
  let generation = 0
  const notify = (cause: unknown) => onlyMessage(requestErrorMessage(cause, t('Finance.failed')), 'error')
  async function reload() {
    const token = ++generation
    loading.value = true
    try {
      const result = await getFormulaVariables(props.projectId)
      if (token === generation) rows.value = result
    } catch (cause) {
      if (token === generation) notify(cause)
    } finally {
      if (token === generation) loading.value = false
    }
  }
  function edit(row?: FormulaVariable) {
    current.value = row
    model.value = row
      ? {
          variableCode: row.variableCode,
          variableName: row.variableName,
          description: row.description,
          sort: row.sort,
          enabled: row.enabled,
          version: row.version
        }
      : defaults()
    editorOpen.value = true
  }
  async function save() {
    if (!/^[A-Z][A-Z0-9_]{1,63}$/.test(model.value.variableCode) || !model.value.variableName.trim()) {
      onlyMessage(t('Standard.variableRequired'), 'warning')
      return
    }
    if (saving.value) return
    saving.value = true
    try {
      await saveFormulaVariable(props.projectId, current.value?.id, model.value)
      editorOpen.value = false
      await reload()
      changed()
      onlyMessage(t('Finance.saved', { name: model.value.variableName }), 'success')
    } catch (cause) {
      notify(cause)
    } finally {
      saving.value = false
    }
  }
  async function remove(row: FormulaVariable) {
    if (saving.value) return
    saving.value = true
    try {
      await deleteFormulaVariable(props.projectId, row)
      await reload()
      changed()
      onlyMessage(t('Finance.deleted', { name: row.variableName }), 'success')
    } catch (cause) {
      notify(cause)
    } finally {
      saving.value = false
    }
  }
  watch(
    () => [props.open, props.projectId] as const,
    () => {
      generation++
      editorOpen.value = false
      rows.value = []
      if (props.open && props.projectId) void reload()
    },
    { immediate: true }
  )
  onScopeDispose(() => {
    generation++
  })
  return { rows, loading, saving, editorOpen, current, model, reload, edit, save, remove, notify }
}
