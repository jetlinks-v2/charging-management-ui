import { computed, onMounted, onScopeDispose, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import dayjs from 'dayjs'
import type { FormInstance, UploadChangeParam } from 'ant-design-vue'
import { onlyMessage } from '@jetlinks-web/utils'
import {
  getCashierOptions,
  getCashierPayers,
  previewCollection,
  collectPayment,
  type CashierInput,
  type CashierCompany,
  type CashierPayer,
  type CollectionPreview,
  type CollectionRequest,
  type PaymentDetail
} from '../../api/financeCashier'
import type { CollectionRecovery } from '../../api/financeCashier'
import type { Receivable } from '../../api/financeReceivable'
import { cashierReductions, cents, money, type CashierReduction } from '../../utils/cashierTree'
import { sumMoney } from '../../utils/receivableTotals'
import { requestErrorMessage } from '../../utils/requestError'
import { paymentRequestId } from '../../utils/paymentRequest'

/** 正式入账使用冻结的预览输入。网络结果未知时只能复用同一请求重查，防止第二笔收款。 */
export function useCashier(
  props: { projectId: string; rows: Receivable[]; reduction?: CashierReduction },
  saved: () => void,
  recovery?: CollectionRecovery
) {
  const { t } = useI18n()
  const form = ref<FormInstance>()
  const companies = ref<CashierCompany[]>([]),
    payers = ref<CashierPayer[]>([])
  const loading = ref(false),
    calculating = ref(false),
    saving = ref(false),
    uncertain = ref(false)
  const recoveryFailed = ref(false)
  const preview = ref<CollectionPreview>(),
    result = ref<PaymentDetail>()
  const files = ref<UploadChangeParam['fileList']>([])
  const uploading = computed(() => files.value.some((file) => file.status === 'uploading'))
  const invalidFiles = computed(() =>
    files.value.some((file) => file.status !== 'done' || !file.response?.result?.id || file.response?.success === false)
  )
  const discounts = cashierReductions(props.rows, props.reduction)
  const model = reactive({
    reduction: props.reduction ? { ...props.reduction } : (undefined as CashierReduction | undefined),
    companyId: '',
    payerName: props.rows[0]?.customerName || '',
    payerRelationshipId: undefined as string | undefined,
    paidAt: dayjs().format('YYYY-MM-DDTHH:mm:ss'),
    remark: '',
    attachmentName: '',
    attachmentFileId: '',
    items: props.rows.map((row) => ({
      id: row.id,
      version: row.version,
      amount: money(cents(row.arrears) - cents(discounts[props.rows.indexOf(row)]))
    })),
    tenders: [] as { optionId: string; amount: string }[]
  })
  let disposed = false,
    generation = 0,
    confirmed: CollectionRequest | undefined
  const funding = computed(() => companies.value.find((company) => company.id === model.companyId)?.funding || [])
  const total = computed(() => {
    try {
      return sumMoney(model.items.map((item) => item.amount || '0'))
    } catch {
      return ''
    }
  })
  const tenderTotal = computed(() => {
    try {
      return sumMoney(model.tenders.map((item) => item.amount || '0'))
    } catch {
      return ''
    }
  })
  const balanced = computed(() => !!total.value && total.value === tenderTotal.value && total.value !== '0.00')
  const notify = (error: unknown) => onlyMessage(requestErrorMessage(error, t('Finance.failed')), 'error')
  function invalidate() {
    ++generation
    preview.value = undefined
    confirmed = undefined
  }
  watch(
    model,
    () => {
      if (!uncertain.value) invalidate()
    },
    { deep: true, flush: 'sync' }
  )
  watch(() => [props.projectId, ...props.rows.map((row) => `${row.id}:${row.version}`)], invalidate)
  function chooseCompany(value: string) {
    model.companyId = value
    const option = funding.value[0]
    model.tenders = option ? [{ optionId: option.id, amount: total.value }] : []
  }
  function choosePayer(value?: string) {
    model.payerRelationshipId = value
    const payer = payers.value.find((item) => item.relationshipId === value)
    if (payer) model.payerName = payer.name
  }
  function addTender() {
    const option = funding.value.find((item) => !model.tenders.some((tender) => tender.optionId === item.id))
    if (option && model.tenders.length < 10) model.tenders.push({ optionId: option.id, amount: '0.00' })
  }
  function filesChanged(info: UploadChangeParam) {
    files.value = info.fileList
    const file = info.fileList[0]
    model.attachmentFileId =
      file?.status === 'done' && file.response?.success !== false ? file.response?.result?.id || '' : ''
    model.attachmentName = model.attachmentFileId ? file.name : ''
  }
  function input(): CashierInput {
    return {
      ...model,
      items: model.items.map((item) => ({ ...item })),
      tenders: model.tenders.map((tender) => {
        const option = funding.value.find((item) => item.id === tender.optionId)
        if (!option) throw new Error(t('Cashier.chooseFunding'))
        return { method: option.method, recordedId: option.recordedId, amount: tender.amount }
      })
    }
  }
  async function load() {
    const project = props.projectId
    loading.value = true
    try {
      const options = await getCashierOptions(project)
      if (disposed || props.projectId !== project) return
      // 公司以账单快照为准；无公司快照的旧账单保留项目公司选择。
      const ids = new Set(props.rows.map((row) => row.companyId || row.snapshot?.standard?.companyId).filter(Boolean))
      companies.value = ids.size > 1 ? [] : ids.size ? options.filter((option) => ids.has(option.id)) : options
      if (ids.size > 1 || (ids.size && !companies.value.length)) notify(new Error(t('CashierDesk.companyMismatch')))
      if (companies.value.length === 1) chooseCompany(companies.value[0].id)
    } catch (error) {
      if (!disposed) notify(error)
    } finally {
      if (!disposed) loading.value = false
    }
    try {
      const options = await getCashierPayers(
        project,
        props.rows.map((row) => row.id)
      )
      if (!disposed && props.projectId === project) {
        payers.value = options
        if (options.length === 1) choosePayer(options[0].relationshipId)
      }
    } catch (error) {
      if (!disposed) notify(error)
    }
  }
  async function calculate() {
    if (
      loading.value ||
      calculating.value ||
      saving.value ||
      uncertain.value ||
      recoveryFailed.value ||
      uploading.value ||
      invalidFiles.value
    )
      return
    try {
      await form.value?.validate()
    } catch {
      return
    }
    if (!balanced.value) {
      onlyMessage(t('Cashier.unbalanced'), 'error')
      return
    }
    invalidate()
    const token = generation,
      project = props.projectId
    calculating.value = true
    try {
      const payload = JSON.parse(JSON.stringify(input())) as CashierInput
      const value = await previewCollection(project, payload)
      if (disposed || token !== generation || project !== props.projectId) return
      preview.value = value
      confirmed = { requestId: paymentRequestId(), token: value.token, input: payload }
    } catch (error) {
      if (!disposed && token === generation) notify(error)
    } finally {
      if (!disposed) calculating.value = false
    }
  }
  async function submit() {
    if (!confirmed || !preview.value || saving.value || result.value) return
    saving.value = true
    // 先可靠保存原请求再发起入账；存储不可用时不发送，不能失去网络中断后的幂等身份。
    try {
      recovery?.write({ request: confirmed, preview: preview.value })
    } catch {
      saving.value = false
      onlyMessage(t('Cashier.recoveryUnavailable'), 'error')
      return
    }
    try {
      const value = await collectPayment(props.projectId, confirmed)
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
            onlyMessage(t('Cashier.recoveryClearFailed'), 'warning')
          }
          uncertain.value = false
          invalidate()
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
        const payload = pending.request.input
        Object.assign(model, {
          ...payload,
          tenders: payload.tenders.map((tender) => ({
            optionId: tender.recordedId || tender.method,
            amount: tender.amount
          }))
        })
        preview.value = pending.preview
        confirmed = pending.request
        uncertain.value = true
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
    invalidate()
  })
  return {
    model,
    form,
    companies,
    payers,
    funding,
    total,
    tenderTotal,
    balanced,
    loading,
    calculating,
    saving,
    uncertain,
    recoveryFailed,
    preview,
    result,
    files,
    uploading,
    invalidFiles,
    filesChanged,
    chooseCompany,
    choosePayer,
    addTender,
    invalidate,
    calculate,
    submit
  }
}
