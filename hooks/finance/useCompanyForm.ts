import { computed, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { onlyMessage } from '@jetlinks-web/utils'
import type { FormInstance } from 'ant-design-vue'
import type { CompanyDetail, CompanyFields, CompanyInput } from '../../api/finance'
import { companyInput } from '../../utils/companyInput'
export function useCompanyForm(
  context: {
    open: boolean
    detail?: CompanyDetail
    state: { loading: boolean; failed: boolean; saving: boolean; readOnly: boolean }
  },
  save: (input: CompanyInput) => void
) {
  const { t } = useI18n()
  const form = ref<FormInstance>()
  const model = reactive<CompanyInput>({
    companyName: '',
    taxNumber: '',
    address: '',
    phone: '',
    depositBank: '',
    bankAccount: '',
    drawer: '',
    reviewer: '',
    estateNo: '',
    banks: []
  })
  const sections = computed(() =>
    [
      {
        title: t('Finance.basic'),
        fields: [
          ['companyName', 100, true],
          ['taxNumber', 50, true],
          ['address', 255, true],
          ['phone', 15, true],
          ['depositBank', 100, true],
          ['bankAccount', 100, true]
        ]
      },
      {
        title: t('Finance.invoice'),
        fields: [
          ['drawer', 60, true],
          ['reviewer', 60, true],
          ['estateNo', 255, true],
          ['shop', 255, false],
          ['legalPersonId', 90, false],
          ['invoiceExtensionNumber', 32, false]
        ]
      }
    ].map((section) => ({
      ...section,
      fields: section.fields.map(([key, max, required]) => ({
        key: key as Exclude<keyof CompanyFields, 'quota'>,
        max: max as number,
        required: required as boolean
      }))
    }))
  )
  watch(
    () => [context.open, context.detail],
    () => {
      if (!context.open) return
      for (const key of Object.keys(model)) delete (model as unknown as Record<string, unknown>)[key]
      Object.assign(
        model,
        context.detail
          ? { ...context.detail.company, banks: context.detail.banks.map((bank) => ({ ...bank })) }
          : {
              companyName: '',
              taxNumber: '',
              address: '',
              phone: '',
              depositBank: '',
              bankAccount: '',
              drawer: '',
              reviewer: '',
              estateNo: '',
              banks: []
            }
      )
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
    if (model.banks.some((bank) => !bank.bankName.trim() || !/^\d{1,100}$/.test(bank.bankAccount.trim()))) {
      onlyMessage(t('Finance.invalidBanks'), 'warning')
      return
    }
    save(companyInput(model))
  }

  return { form, model, sections, submit }
}
