import { computed, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { FormInstance } from 'ant-design-vue'
import type { TaxInput, TaxItem } from '../../api/financeTax'

/** 税目全字段原子提交，百分比展示与0..1存储在表单边界转换。 */
export function useTaxForm(
  props: { open: boolean; detail?: TaxItem; companyId?: string },
  save: (input: TaxInput) => void
) {
  const { t } = useI18n()
  const form = ref<FormInstance>()
  const defaults = (): TaxInput => ({
    companyId: props.companyId || '',
    goodsName: '',
    goodsCode: '',
    classificationName: '',
    taxRate: null,
    includingTaxFlag: 0,
    favouredPolicyFlag: 0
  })
  const model = reactive<TaxInput>(defaults())
  const ratePercent = computed({
    get: () => (model.taxRate == null ? undefined : Number((model.taxRate * 100).toFixed(6))),
    set: (value: number | undefined) => {
      model.taxRate = value == null ? null : Number((value / 100).toFixed(6))
    }
  })
  const price = computed({
    get: () => model.price ?? undefined,
    set: (value: string | undefined) => {
      model.price = value ?? null
    }
  })
  const stringFields = computed(() =>
    (
      [
        ['goodsName', 255, true],
        ['goodsShortName', 100, false],
        ['goodsCode', 64, true],
        ['classificationName', 255, true],
        ['specAndTypes', 255, false],
        ['unit', 50, false]
      ] as const
    ).map(([key, max, required]) => ({ key, max, required, label: t('FinanceTax.' + key) }))
  )
  watch(
    () => [props.open, props.detail] as const,
    () => {
      if (!props.open) return
      for (const key of Object.keys(model)) delete (model as unknown as Record<string, unknown>)[key]
      Object.assign(model, defaults(), props.detail || {})
      form.value?.clearValidate()
    },
    { immediate: true }
  )
  async function submit() {
    try {
      await form.value?.validate()
    } catch {
      return
    }
    const {
      companyId,
      version,
      goodsName,
      goodsShortName,
      goodsCode,
      classificationName,
      specAndTypes,
      unit,
      taxRate,
      price,
      includingTaxFlag,
      favouredPolicyFlag,
      favouredPolicyName
    } = model
    save({
      companyId,
      version,
      goodsName,
      goodsShortName,
      goodsCode,
      classificationName,
      specAndTypes,
      unit,
      taxRate,
      price,
      includingTaxFlag,
      favouredPolicyFlag,
      favouredPolicyName
    })
  }
  return { form, model, ratePercent, price, stringFields, submit }
}
