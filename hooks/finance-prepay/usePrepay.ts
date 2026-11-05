import { computed, onMounted, onScopeDispose, reactive, ref, shallowRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import dayjs from 'dayjs'
import type { FormInstance, UploadChangeParam } from 'ant-design-vue'
import { onlyMessage } from '@jetlinks-web/utils'
import {
  getCashierOptions,
  type CashierCompany,
  type FundingOption,
  type PaymentDetail
} from '../../api/financeCashier'
import {
  getPrepayOptions,
  createPrepayQuote,
  confirmPrepay,
  type PrepayQuote,
  type PrepaySetting,
  type PrepayRecovery,
  type PendingPrepay
} from '../../api/financePrepay'
import { sumMoney } from '../../utils/receivableTotals'
import { paymentRequestId } from '../../utils/paymentRequest'
import { requestErrorMessage } from '../../utils/requestError'

/** 报价由服务端定价；第一次确认前冻结并保存原请求，未知结果只能重试原请求。 */
export function usePrepay(
  props: { projectId: string; spaceId: string; spaceName: string },
  saved: () => void,
  recovery?: PrepayRecovery
) {
  const { t } = useI18n(),
    form = ref<FormInstance>()
  const settings = ref<PrepaySetting[]>([]),
    companies = ref<CashierCompany[]>([])
  const quote = ref<PrepayQuote>(),
    result = ref<PaymentDetail>()
  const loadFailed = ref(false),
    loading = ref(false),
    calculating = ref(false),
    saving = ref(false),
    uncertain = ref(false),
    recoveryFailed = ref(false)
  const files = ref<UploadChangeParam['fileList']>([])
  const uploading = computed(() => files.value.some((f) => f.status === 'uploading'))
  const invalidFiles = computed(() =>
    files.value.some((f) => f.status !== 'done' || !f.response?.result?.id || f.response?.success === false)
  )
  const model = reactive({
    settingId: '',
    payerRelationshipId: '',
    activityId: '',
    tierIndex: undefined as number | undefined,
    paidMonths: 1,
    paidAt: dayjs().format('YYYY-MM-DDTHH:mm:ss'),
    remark: '',
    attachmentName: '',
    attachmentFileId: '',
    tenders: [] as { optionId: string; amount: string }[]
  })
  const setting = computed(() => settings.value.find((s) => s.id === model.settingId))
  const activity = computed(() => setting.value?.activities.find((a) => a.id === model.activityId))
  const company = computed(() => companies.value.find((c) => c.id === setting.value?.companyId))
  const total = computed(() => quote.value?.payAmount || '0.00')
  const funding = computed<FundingOption[]>(() => frozen.value?.funding || company.value?.funding || [])
  const companyName = computed(() => frozen.value?.companyName || company.value?.name || '')
  const tenderTotal = computed(() => {
    try {
      return sumMoney(model.tenders.map((t) => t.amount || '0'))
    } catch {
      return ''
    }
  })
  const balanced = computed(() => total.value !== '0.00' && total.value === tenderTotal.value)
  const frozen = shallowRef<PendingPrepay>()
  let generation = 0,
    disposed = false
  const notify = (error: unknown) => onlyMessage(requestErrorMessage(error, t('Finance.failed')), 'error')
  function invalidate() {
    if (!uncertain.value && !saving.value) {
      ++generation
      quote.value = undefined
      frozen.value = undefined
    }
  }
  watch(
    () => [
      model.settingId,
      model.payerRelationshipId,
      model.activityId,
      model.tierIndex,
      model.paidMonths,
      props.projectId,
      props.spaceId
    ],
    invalidate,
    { flush: 'sync' }
  )
  function chooseSetting(id: string) {
    model.settingId = id
    model.activityId = ''
    model.tierIndex = undefined
    model.payerRelationshipId = setting.value?.payers.length === 1 ? setting.value.payers[0].relationshipId : ''
    model.paidMonths = setting.value?.settlementMethod === 'QUARTERLY' ? 3 : 1
  }
  function addTender() {
    const option = funding.value.find((o) => !model.tenders.some((t) => t.optionId === o.id))
    if (option && model.tenders.length < 10) model.tenders.push({ optionId: option.id, amount: '0.00' })
  }
  function filesChanged(info: UploadChangeParam) {
    files.value = info.fileList
    const file = info.fileList[0]
    model.attachmentFileId =
      file?.status === 'done' && file.response?.success !== false ? file.response?.result?.id || '' : ''
    model.attachmentName = model.attachmentFileId ? file.name : ''
  }
  async function load() {
    const token = ++generation,
      project = props.projectId,
      space = props.spaceId
    loading.value = true
    loadFailed.value = false
    try {
      const [choices, paymentOptions] = await Promise.all([
        getPrepayOptions(project, space),
        getCashierOptions(project)
      ])
      if (disposed || token !== generation || project !== props.projectId || space !== props.spaceId) return
      settings.value = choices
      companies.value = paymentOptions
      if (choices.length === 1) chooseSetting(choices[0].id)
    } catch (error) {
      if (!disposed) {
        loadFailed.value = true
        notify(error)
      }
    } finally {
      if (!disposed) loading.value = false
    }
  }
  async function calculate() {
    if (loading.value || calculating.value || saving.value || uncertain.value || recoveryFailed.value || result.value)
      return
    try {
      const tier = model.activityId ? activity.value?.tiers[model.tierIndex ?? -1] : undefined
      const months = tier?.paidMonths ?? model.paidMonths
      if (
        !setting.value ||
        !setting.value.payers.some((p) => p.relationshipId === model.payerRelationshipId) ||
        (model.activityId && !tier) ||
        !Number.isInteger(months) ||
        months < 1 ||
        months > 1200 ||
        (setting.value.settlementMethod === 'QUARTERLY' && (months % 3 !== 0 || (tier?.giftMonths || 0) % 3 !== 0))
      ) {
        onlyMessage(t('Prepay.selectionInvalid'), 'warning')
        return
      }
      if (!company.value?.funding.length) {
        onlyMessage(t('Cashier.chooseFunding'), 'warning')
        return
      }
      invalidate()
      const token = generation,
        project = props.projectId
      calculating.value = true
      try {
        const value = await createPrepayQuote(project, {
          requestId: paymentRequestId(),
          settingId: model.settingId,
          payerRelationshipId: model.payerRelationshipId,
          activityId: model.activityId || undefined,
          paidMonths: months,
          giftMonths: tier?.giftMonths || 0
        })
        if (disposed || token !== generation || project !== props.projectId) return
        quote.value = value
        model.tenders = [{ optionId: funding.value[0].id, amount: value.payAmount }]
      } finally {
        if (!disposed) calculating.value = false
      }
    } catch (error) {
      if (!disposed) notify(error)
    }
  }
  async function prepareConfirmation() {
    if (!quote.value) return false
    if (uploading.value || invalidFiles.value || !balanced.value) {
      onlyMessage(t('Cashier.unbalanced'), 'warning')
      return false
    }
    try {
      await form.value?.validate()
    } catch {
      return false
    }
    if (!quote.value || quote.value.status !== 'OPEN' || quote.value.expiresAt <= Date.now()) {
      onlyMessage(t('Prepay.expired'), 'warning')
      quote.value = undefined
      return false
    }
    try {
      const value = JSON.parse(
        JSON.stringify({
          projectId: props.projectId,
          spaceId: props.spaceId,
          quote: quote.value,
          companyName: companyName.value,
          funding: funding.value,
          request: {
            requestId: paymentRequestId(),
            version: quote.value.version,
            companyId: setting.value?.companyId,
            paidAt: model.paidAt,
            remark: model.remark,
            attachmentName: model.attachmentName,
            attachmentFileId: model.attachmentFileId,
            tenders: model.tenders.map((tender) => {
              const option = funding.value.find((o) => o.id === tender.optionId)
              if (!option) throw new Error(t('Cashier.chooseFunding'))
              return { method: option.method, recordedId: option.recordedId, amount: tender.amount }
            })
          }
        })
      ) as PendingPrepay
      recovery?.write(value)
      frozen.value = value
      return true
    } catch {
      onlyMessage(t('Cashier.recoveryUnavailable'), 'error')
      return false
    }
  }
  async function submit() {
    if (!quote.value || saving.value || result.value || recoveryFailed.value) return
    // 校验也纳入互斥区，防止快速双击在异步表单校验后生成两个付款请求号。
    saving.value = true
    try {
      if (!uncertain.value && !(await prepareConfirmation())) return
      if (!frozen.value) return
      const value = await confirmPrepay(frozen.value.projectId, frozen.value.quote.id, frozen.value.request)
      if (!disposed) {
        result.value = value
        uncertain.value = false
        try {
          recovery?.clear()
        } catch {
          onlyMessage(t('Cashier.recoveryClearFailed'), 'warning')
        }
        saved()
      }
    } catch (error) {
      if (!disposed) {
        const status = (error as { response?: { status?: number } })?.response?.status
        if (status && status >= 400 && status < 500 && !uncertain.value) {
          try {
            recovery?.clear()
          } catch {
            recoveryFailed.value = true
            onlyMessage(t('Cashier.recoveryClearFailed'), 'warning')
          }
          quote.value = undefined
          frozen.value = undefined
          notify(error)
        } else {
          uncertain.value = true
          onlyMessage(t('Cashier.unknownResult'), 'warning')
        }
      }
    } finally {
      if (!disposed) saving.value = false
    }
  }
  onMounted(() => {
    try {
      const pending = recovery?.read()
      if (pending) {
        frozen.value = pending
        quote.value = pending.quote
        uncertain.value = true
        Object.assign(model, pending.request, {
          tenders: pending.request.tenders.map((t) => ({
            optionId: pending.funding.find((o) => o.method === t.method && o.recordedId === t.recordedId)?.id || '',
            amount: t.amount
          }))
        })
        return
      }
    } catch {
      recoveryFailed.value = true
      onlyMessage(t('Cashier.recoveryUnavailable'), 'error')
      return
    }
    void load()
  })
  onScopeDispose(() => {
    disposed = true
    ++generation
  })
  return {
    model,
    form,
    settings,
    setting,
    activity,
    companyName,
    funding,
    total,
    tenderTotal,
    balanced,
    quote,
    result,
    loadFailed,
    loading,
    calculating,
    saving,
    uncertain,
    recoveryFailed,
    files,
    uploading,
    invalidFiles,
    filesChanged,
    chooseSetting,
    addTender,
    calculate,
    submit,
    invalidate,
    load
  }
}
