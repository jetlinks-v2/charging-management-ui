import { computed, onMounted, onScopeDispose, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import dayjs from 'dayjs'
import type { FormInstance, UploadChangeParam } from 'ant-design-vue'
import {
  getFundsOptions,
  getFundsHouse,
  getFundQuote,
  type FundDraft,
  type FundInput,
  type FundsOptions
} from '../../api/financeFunds'
import type { HouseContext } from '../../api/financeSetting'
import { useFundConfirmation } from './useFundConfirmation'
import { useFundRecovery } from './useFundRecovery'
/** 来源选择和确认状态分离，切换房屋/标准使旧预览失效，不丢失未知结果。 */
export function useFundEditor(props: { projectId: string; draft: FundDraft }, saved: () => void) {
  const { t } = useI18n(),
    form = ref<FormInstance>(),
    loading = ref(false),
    picker = ref<'source' | 'target'>(),
    house = ref<HouseContext>(),
    target = ref<HouseContext>()
  const options = ref<FundsOptions>({ projectSubjects: [], standards: [], companies: [] }),
    account = props.draft.account
  const confirmation = useFundConfirmation(
    props.projectId,
    useFundRecovery(() => props.projectId),
    saved
  )
  const model = reactive<FundInput>({
    action: props.draft.action,
    type: props.draft.type,
    accountId: account?.id,
    version: account?.version,
    companyId: account?.companyId || '',
    spaceId: account?.spaceId,
    relationshipId: account?.relationshipId,
    standardId: account?.standardId,
    amount: account?.balance || '',
    occurredAt: dayjs().format('YYYY-MM-DDTHH:mm:ss'),
    payerName: account?.customerName || '',
    reason: '',
    targetType: 'ADVANCE'
  })
  const company = computed(() => options.value.companies.find((v) => v.id === model.companyId))
  const files = ref<UploadChangeParam['fileList']>([])
  function filesChanged(info: UploadChangeParam) {
    files.value = info.fileList
    const file = info.fileList[0]
    model.attachmentFileId =
      file?.status === 'done' && file.response?.success !== false ? file.response?.result?.id : undefined
    model.attachmentName = model.attachmentFileId ? file.name : undefined
  }
  const funding = computed(() => company.value?.funding || []),
    optionId = ref('')
  const availableStandards = computed(() =>
    options.value.standards.filter((v) => !model.companyId || v.companyId === model.companyId)
  )
  const standard = computed(() => options.value.standards.find((v) => v.id === model.standardId))
  let disposed = false,
    loadToken = 0,
    quoteToken = 0
  watch(model, () => confirmation.invalidate(), { deep: true, flush: 'sync' })
  watch(optionId, () => {
    const v = funding.value.find((v) => v.id === optionId.value)
    model.method = v?.method
    model.recordedId = v?.recordedId
  })
  watch(
    () => model.companyId,
    () => {
      if (confirmation.uncertain.value) return
      optionId.value = funding.value[0]?.id || ''
      if (model.action === 'TOPUP' && standard.value?.companyId !== model.companyId) {
        model.standardId = undefined
        ++quoteToken
        model.quantity = undefined
      }
    }
  )
  async function pick(space: string) {
    const n = ++loadToken
    loading.value = true
    try {
      const value = await getFundsHouse(props.projectId, space)
      if (disposed || n !== loadToken) return
      if (picker.value === 'target') {
        target.value = value
        model.targetSpaceId = space
        model.targetRelationshipId = undefined
      } else {
        house.value = value
        model.spaceId = space
        model.relationshipId = undefined
      }
      picker.value = undefined
    } catch (e) {
      confirmation.notify(e)
    } finally {
      if (!disposed && n === loadToken) loading.value = false
    }
  }
  function standardChanged() {
    if (standard.value) {
      model.companyId = standard.value.companyId
      void quote()
    }
  }
  async function quote() {
    const n = ++quoteToken
    if (!model.standardId || !model.quantity || model.action !== 'TOPUP') return
    try {
      const amount = await getFundQuote(props.projectId, model.standardId, model.companyId, model.quantity)
      if (!disposed && n === quoteToken) model.amount = amount
    } catch (e) {
      if (!disposed && n === quoteToken) confirmation.notify(e)
    }
  }
  async function calculate() {
    if (loading.value) return
    if (files.value.some((v) => v.status === 'uploading' || v.status === 'error')) {
      confirmation.notify(new Error(t('Funds.attachmentPending')))
      return
    }
    try {
      await form.value?.validate()
    } catch {
      return
    }
    await confirmation.calculate({ ...model })
  }
  onMounted(async () => {
    const restored = confirmation.restore()
    if (restored) {
      Object.assign(model, restored)
      return
    }
    if (confirmation.failed.value) return
    loading.value = true
    try {
      options.value = await getFundsOptions(props.projectId)
      if (disposed) return
      if (!model.companyId && options.value.companies.length === 1) model.companyId = options.value.companies[0].id
      optionId.value = funding.value[0]?.id || ''
      if (props.draft.initialSpace && !account) {
        picker.value = 'source'
        await pick(props.draft.initialSpace)
      }
    } catch (e) {
      if (!disposed) confirmation.notify(e)
    } finally {
      if (!disposed) loading.value = false
    }
  })
  watch(
    () => model.relationshipId,
    () => {
      const c = house.value?.customers.find((v) => v.relationshipId === model.relationshipId)
      if (c) model.payerName = c.name
    }
  )
  onScopeDispose(() => {
    disposed = true
    ++loadToken
    ++quoteToken
  })
  return {
    t,
    account,
    form,
    loading,
    picker,
    house,
    target,
    options,
    model,
    company,
    funding,
    optionId,
    availableStandards,
    standard,
    confirmation,
    pick,
    standardChanged,
    quote,
    calculate,
    files,
    filesChanged
  }
}
