import { onScopeDispose, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { onlyMessage } from '@jetlinks-web/utils'
import { getDocumentRule, saveDocumentRule, type DocumentRule } from '../../api/financeDocument'
import { useProjectContext, useProjectSwitchGuard } from '../project/useProjectContext'
import { requestErrorMessage } from '../../utils/requestError'
export function useDocumentRule() {
  const { t } = useI18n(),
    { projectId } = useProjectContext()
  const loading = ref(false),
    saving = ref(false),
    failed = ref(false),
    editing = ref(false)
  const current = ref<DocumentRule>()
  const model = reactive<DocumentRule & { reason: string }>({
    version: null,
    timeLimitType: 'NATURAL_YEAR',
    limitDays: null,
    maxReopenTimes: 0,
    reason: ''
  })
  let generation = 0,
    disposed = false
  const notify = (e: unknown) => onlyMessage(requestErrorMessage(e, t('Finance.failed')), 'error')
  async function load() {
    const n = ++generation
    if (!projectId.value) {
      current.value = undefined
      return
    }
    loading.value = true
    failed.value = false
    try {
      const row = await getDocumentRule(projectId.value)
      if (!disposed && n === generation) {
        current.value = row
        editing.value = false
      }
    } catch (e) {
      if (!disposed && n === generation) {
        failed.value = true
        notify(e)
      }
    } finally {
      if (!disposed && n === generation) loading.value = false
    }
  }
  function edit() {
    if (current.value) {
      Object.assign(model, current.value, { reason: '' })
      editing.value = true
    }
  }
  async function save() {
    if (
      saving.value ||
      !editing.value ||
      !model.reason.trim() ||
      model.reason.trim().length > 500 ||
      (model.timeLimitType === 'CUSTOM_DAYS' &&
        (!Number.isInteger(model.limitDays) || model.limitDays! < 1 || model.limitDays! > 36500)) ||
      (model.maxReopenTimes !== null && (!Number.isInteger(model.maxReopenTimes) || model.maxReopenTimes < 0))
    )
      return
    saving.value = true
    try {
      const value = await saveDocumentRule(projectId.value, {
        ...model,
        limitDays: model.timeLimitType === 'CUSTOM_DAYS' ? model.limitDays : null,
        reason: model.reason.trim()
      })
      if (!disposed) {
        current.value = value
        editing.value = false
        onlyMessage(t('Document.ruleSaved'), 'success')
      }
    } catch (e) {
      if (!disposed) notify(e)
    } finally {
      if (!disposed) saving.value = false
    }
  }
  watch(
    projectId,
    () => {
      editing.value = false
      current.value = undefined
      void load()
    },
    { immediate: true }
  )
  useProjectSwitchGuard(() => !saving.value && !editing.value)
  onScopeDispose(() => {
    disposed = true
    ++generation
  })
  return { projectId, loading, saving, failed, editing, current, model, load, edit, save }
}
