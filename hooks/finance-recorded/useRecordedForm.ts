import { reactive, ref, toRaw, watch } from 'vue'
import type { FormInstance } from 'ant-design-vue'
import type { RecordedDetail, RecordedInput } from '../../api/financeRecorded'
import { appendTier, emptyRecorded, normalizeRecorded, recordedInput, setFeeType } from './model'
interface Props {
  open: boolean
  detail?: RecordedDetail
  readOnly: boolean
}
export function useRecordedForm(
  props: Props,
  loadBanks: (companyId: string, bankId?: string) => Promise<string | undefined>,
  save: (input: RecordedInput) => void
) {
  const model = reactive<RecordedInput>(emptyRecorded())
  const form = ref<FormInstance>()
  watch(
    () => [props.open, props.detail] as const,
    () => {
      Object.assign(model, props.detail ? recordedInput(props.detail) : emptyRecorded())
      form.value?.clearValidate()
      if (props.open && !props.readOnly && model.companyId) void loadBanks(model.companyId, model.bankId)
    },
    { immediate: true }
  )
  async function companyChanged(value: unknown) {
    if (typeof value !== 'string') return
    model.companyId = value
    model.bankId = ''
    await loadBanks(value)
  }
  const changeFeeType = (value: 1 | 2 | null) => setFeeType(model, value)
  function selection(field: 'sourceCharges' | 'patternPayments', value: unknown) {
    model[field] = Array.isArray(value)
      ? value.filter((item): item is string => typeof item === 'string')
      : typeof value === 'string'
        ? [value]
        : []
  }
  const addTier = () => appendTier(model)
  function removeTier(index: number) {
    model.tiers.splice(index, 1)
    if (model.tiers.length) model.tiers[model.tiers.length - 1].maximumAmount = null
  }
  async function submit() {
    try {
      await form.value?.validate()
    } catch {
      return
    }
    save(normalizeRecorded(toRaw(model)))
  }
  return { model, form, companyChanged, selection, changeFeeType, addTier, removeTier, submit }
}
