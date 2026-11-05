import { ref, watch } from 'vue'
import type { Subject, SubjectInput } from '../../api/financeSubject'
export function useSubjectForm(
  props: { open: boolean; detail?: Subject; selectedCategory: string },
  submit: (input: SubjectInput) => void
) {
  const model = ref<SubjectInput>({
    categoryId: '',
    name: '',
    feeType: '',
    enabled: true,
    autoInvoice: false,
    arrearsConfigId: ''
  })
  const form = ref<{ validate: () => Promise<unknown> }>()
  watch(
    () => [props.open, props.detail] as const,
    () => {
      if (!props.open) return
      model.value = props.detail
        ? {
            categoryId: props.detail.categoryId,
            name: props.detail.name,
            feeType: props.detail.feeType,
            enabled: props.detail.enabled,
            autoInvoice: props.detail.autoInvoice,
            arrearsConfigId: props.detail.arrearsConfigId,
            remark: props.detail.remark,
            version: props.detail.version
          }
        : {
            categoryId: props.selectedCategory,
            name: '',
            feeType: '',
            enabled: true,
            autoInvoice: false,
            arrearsConfigId: '',
            remark: ''
          }
    },
    { immediate: true }
  )
  async function save() {
    try {
      await form.value?.validate()
      submit({ ...model.value })
    } catch {
      /* 表单在字段旁提示校验结果。 */
    }
  }
  return { model, form, save }
}
