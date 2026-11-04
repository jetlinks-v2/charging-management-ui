import { computed, onScopeDispose, reactive, ref, watch } from 'vue'
import type { FormInstance } from 'ant-design-vue'
import { useI18n } from 'vue-i18n'
import { onlyMessage } from '@jetlinks-web/utils'
import {
  getSplitOptions,
  previewSplit,
  submitSplit,
  type Receivable,
  type SplitInput,
  type SplitOption,
  type SplitPreview
} from '../../api/financeReceivable'
import { requestErrorMessage } from '../../utils/requestError'

/** 金额只接受后端预览；客户、日期、版本或项目改变后，旧预览立即失效。 */
export function useReceivableSplit(props: { projectId: string; detail: Receivable }, saved: () => void) {
  const { t } = useI18n()
  const form = ref<FormInstance>()
  const loading = ref(false),
    failed = ref(false),
    calculating = ref(false),
    saving = ref(false)
  const options = ref<SplitOption[]>([]),
    preview = ref<SplitPreview>()
  const model = reactive<SplitInput>({
    version: props.detail.version,
    splitDate: '',
    scale: 2,
    firstRelationshipId: props.detail.customerRelationshipId,
    secondRelationshipId: props.detail.customerRelationshipId,
    reason: ''
  })
  const lastDate = computed(() =>
    props.detail.periodStatus === 'CLOSED'
      ? props.detail.calcEndDate
      : [props.detail.calcEndDate, props.detail.accruedAsOfDate].filter(Boolean).sort()[0]
  )
  let generation = 0,
    loadGeneration = 0,
    disposed = false,
    confirmed: SplitInput | undefined
  let fingerprint = ''
  const input = (): SplitInput => JSON.parse(JSON.stringify(model))
  const notify = (error: unknown) => onlyMessage(requestErrorMessage(error, t('Finance.failed')), 'error')
  function invalidate() {
    ++generation
    preview.value = undefined
    confirmed = undefined
    fingerprint = ''
  }
  watch(model, invalidate, { deep: true, flush: 'sync' })
  async function load() {
    const token = ++loadGeneration
    invalidate()
    loading.value = true
    failed.value = false
    options.value = []
    try {
      const result = await getSplitOptions(props.projectId, props.detail.id)
      if (!disposed && token === loadGeneration) options.value = result
    } catch (error) {
      if (!disposed && token === loadGeneration) {
        failed.value = true
        notify(error)
      }
    } finally {
      if (!disposed && token === loadGeneration) loading.value = false
    }
  }
  watch(() => [props.projectId, props.detail.id, props.detail.version], load, { immediate: true })
  async function calculate() {
    if (loading.value || failed.value || calculating.value || saving.value) return
    try {
      await form.value?.validate()
    } catch {
      return
    }
    invalidate()
    const token = generation,
      submitted = input()
    calculating.value = true
    try {
      const result = await previewSplit(props.projectId, props.detail.id, submitted)
      if (!disposed && token === generation) {
        preview.value = result
        confirmed = submitted
        fingerprint = JSON.stringify(submitted)
      }
    } catch (error) {
      if (!disposed && token === generation) notify(error)
    } finally {
      if (!disposed) calculating.value = false
    }
  }
  async function submit() {
    if (!preview.value || !confirmed || calculating.value || saving.value) return
    if (JSON.stringify(input()) !== fingerprint) {
      invalidate()
      return
    }
    const submitted = confirmed,
      token = preview.value.token
    saving.value = true
    try {
      await submitSplit(props.projectId, props.detail.id, submitted, token)
      if (!disposed) {
        onlyMessage(t('Split.saved'), 'success')
        saved()
      }
    } catch (error) {
      if (!disposed) {
        invalidate()
        notify(error)
      }
    } finally {
      if (!disposed) saving.value = false
    }
  }
  onScopeDispose(() => {
    disposed = true
    ++loadGeneration
    invalidate()
  })
  return {
    model,
    form,
    options,
    preview,
    loading,
    failed,
    calculating,
    saving,
    lastDate,
    load,
    calculate,
    submit,
    invalidate
  }
}
