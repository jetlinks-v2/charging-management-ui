import { computed, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { onlyMessage } from '@jetlinks-web/utils'
import type { FormInstance } from 'ant-design-vue'
import type { StandardInput, FinanceStandard, StandardOptions } from '../../api/financeStandard'
import type { TaxItem } from '../../api/financeTax'
import { formulaDisplay } from './formula'
export function useStandardForm(
  props: { open: boolean; detail?: FinanceStandard; options: StandardOptions; selectedSubjectId?: string },
  save: (input: StandardInput) => void
) {
  const { t } = useI18n(),
    form = ref<FormInstance>()
  const defaults = (): StandardInput => ({
    standardCode: '',
    standardName: '',
    subjectId: props.selectedSubjectId || '',
    billingMethod: 'AREA',
    formulaExpression: '',
    formulaDisplay: '',
    price: null,
    chargeRoundType: 2,
    mantissa: 0,
    settlementMethod: 'MONTHLY',
    taxItemId: '',
    companyId: '',
    isDelay: 0,
    delayCalcForm: 0,
    delayRoundType: 0,
    delayBaseType: 'CURRENT_RECEIVABLE',
    executeDate: null,
    cancelDate: null
  })
  const model = reactive<StandardInput>(defaults()),
    tax = ref<TaxItem>()
  const variables = computed(() => {
    const current = new Map(props.options.variables.map((row) => [row.variableCode, row]))
    // 停用的历史定义只用于解释旧公式，不混入新增可选变量。
    for (const row of props.detail?.variablesSnapshot || [])
      if (!current.has(row.variableCode)) current.set(row.variableCode, row)
    return [...current.values()]
  })
  const display = computed(() => formulaDisplay(model.formulaExpression, variables.value))
  watch(
    () => [props.open, props.detail] as const,
    () => {
      if (!props.open) return
      for (const key of Object.keys(model)) delete (model as unknown as Record<string, unknown>)[key]
      Object.assign(model, defaults(), props.detail || {})
      if (!props.detail) {
        const initial = props.options.billingMethods.find((row) => row.value === model.billingMethod)
        model.formulaExpression = initial?.defaultExpression || ''
      }
      tax.value = props.detail?.taxSnapshot
        ? {
            ...props.detail.taxSnapshot,
            id: props.detail.taxItemId,
            version: props.detail.taxSnapshot.taxItemVersion,
            companyId: props.detail.companyId,
            taxRate: Number(props.detail.taxSnapshot.taxRate)
          }
        : undefined
      form.value?.clearValidate()
    },
    { immediate: true }
  )
  function changeMethod(value: string) {
    const method = props.options.billingMethods.find((row) => row.value === value)
    model.formulaExpression = method?.defaultExpression || ''
  }
  function selectTax(row: TaxItem) {
    model.taxItemId = row.id
    model.companyId = row.companyId
    tax.value = row
  }
  async function submit() {
    try {
      await form.value?.validate()
    } catch {
      return
    }
    if (model.executeDate && model.cancelDate && model.executeDate > model.cancelDate) {
      onlyMessage(t('Standard.dateOrder'), 'warning')
      return
    }
    // 不提交后端详情/快照字段；关闭逾期时清空旧规则，避免隐藏数据继续参与计算。
    const {
      version,
      standardCode,
      standardName,
      subjectId,
      billingMethod,
      formulaExpression,
      price,
      chargeRoundType,
      mantissa,
      settlementMethod,
      taxItemId,
      companyId,
      isDelay,
      delayCalcForm,
      delayRoundType,
      delayBaseType,
      rateAmount,
      executeDate,
      cancelDate,
      remark
    } = model
    save({
      version,
      standardCode: standardCode.trim(),
      standardName: standardName.trim(),
      subjectId,
      billingMethod,
      formulaExpression,
      formulaDisplay: display.value,
      price,
      chargeRoundType,
      mantissa,
      settlementMethod,
      taxItemId,
      companyId,
      isDelay,
      delayCalcForm: isDelay ? delayCalcForm : null,
      delayRoundType: isDelay ? delayRoundType : null,
      delayBaseType: isDelay ? delayBaseType : null,
      rateAmount: isDelay ? rateAmount : null,
      executeDate: executeDate || null,
      cancelDate: cancelDate || null,
      remark
    })
  }
  return { form, model, tax, variables, display, changeMethod, selectTax, submit }
}
