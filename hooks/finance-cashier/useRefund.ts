import { computed, onMounted, onScopeDispose, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import dayjs from 'dayjs'
import type { FormInstance, UploadChangeParam } from 'ant-design-vue'
import { onlyMessage } from '@jetlinks-web/utils'
import { type PaymentRecord, type CashierCompany } from '../../api/financeCashier'
import {
  getRefundOptions,
  getRefundSources,
  previewRefund,
  confirmRefund,
  type RefundInput,
  type RefundPreview,
  type RefundDetail,
  type RefundRequest,
  type RefundRecovery
} from '../../api/financeRefund'
import { paymentRequestId } from '../../utils/paymentRequest'
import { requestErrorMessage } from '../../utils/requestError'
import { sumMoney } from '../../utils/receivableTotals'
import { refundableMoney } from '../../utils/refundMoney'

/** 退款预览与原请求绑定；未知结果只能重查原号，不允许再次创建退款。 */
export function useRefund(
  props: { projectId: string; rows: PaymentRecord[] },
  saved: () => void,
  recovery: RefundRecovery
) {
  const { t } = useI18n()
  const form = ref<FormInstance>()
  const loading = ref(false),
    calculating = ref(false),
    saving = ref(false),
    uncertain = ref(false),
    recoveryFailed = ref(false)
  const companies = ref<CashierCompany[]>([]),
    preview = ref<RefundPreview>(),
    result = ref<RefundDetail>()
  const files = ref<UploadChangeParam['fileList']>([])
  const sourceRows = ref<PaymentRecord[]>(props.rows)
  const uploading = computed(() => files.value.some((file) => file.status === 'uploading'))
  const invalidFiles = computed(() =>
    files.value.some((file) => file.status !== 'done' || !file.response?.result?.id || file.response?.success === false)
  )
  const available = computed(() => sumMoney(sourceRows.value.map((row) => refundableMoney(row.line))))
  const model = reactive({
    companyId: '',
    amount: available.value,
    optionId: '',
    receiverName: '',
    refundedAt: dayjs().format('YYYY-MM-DDTHH:mm:ss'),
    reason: '',
    attachmentName: '',
    attachmentFileId: ''
  })
  const company = computed(() => companies.value.find((item) => item.id === model.companyId))
  const funding = computed(() => company.value?.funding || [])
  const notify = (error: unknown) => onlyMessage(requestErrorMessage(error, t('Finance.failed')), 'error')
  let disposed = false,
    generation = 0,
    confirmed: RefundRequest | undefined
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
  function filesChanged(info: UploadChangeParam) {
    files.value = info.fileList
    const file = files.value[0]
    model.attachmentFileId =
      file?.status === 'done' && file.response?.success !== false ? file.response?.result?.id || '' : ''
    model.attachmentName = model.attachmentFileId ? file.name : ''
  }
  function input(): RefundInput {
    const option = funding.value.find((item) => item.id === model.optionId)
    if (!option) throw new Error(t('Cashier.chooseFunding'))
    return {
      companyId: model.companyId,
      amount: model.amount,
      method: option.method,
      recordedId: option.recordedId,
      receiverName: model.receiverName,
      refundedAt: model.refundedAt,
      reason: model.reason,
      attachmentFileId: model.attachmentFileId,
      attachmentName: model.attachmentName,
      items: sourceRows.value.map((row) => ({ id: row.line.id, version: row.line.version }))
    }
  }
  async function load() {
    loading.value = true
    try {
      const [options, receipts] = await Promise.all([
        getRefundOptions(props.projectId),
        getRefundSources(
          props.projectId,
          sourceRows.value.map((row) => row.line.id)
        )
      ])
      if (disposed) return
      const companyId = receipts[0]?.companyId
      if (!companyId || receipts.some((row) => row.companyId !== companyId)) throw new Error(t('Refund.sameCompany'))
      sourceRows.value = receipts
      model.amount = available.value
      companies.value = options
      model.companyId = companyId
      model.receiverName = receipts[0].payerName
      model.optionId = funding.value[0]?.id || ''
    } catch (error) {
      if (!disposed) notify(error)
    } finally {
      if (!disposed) loading.value = false
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
    invalidate()
    const token = generation
    calculating.value = true
    try {
      const payload = input()
      const value = await previewRefund(props.projectId, payload)
      if (disposed || token !== generation) return
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
    try {
      recovery.write({ request: confirmed, preview: preview.value })
    } catch {
      saving.value = false
      onlyMessage(t('Cashier.recoveryUnavailable'), 'error')
      return
    }
    try {
      const value = await confirmRefund(props.projectId, confirmed)
      if (!disposed) {
        result.value = value
        uncertain.value = false
        clearPending()
        saved()
      }
    } catch (error) {
      if (!disposed) {
        const status = (error as { response?: { status?: number } })?.response?.status
        if (status && status >= 400 && status < 500 && !uncertain.value) {
          clearPending()
          invalidate()
          notify(error)
        } else {
          uncertain.value = true
          onlyMessage(t('Refund.unknownResult'), 'warning')
        }
      }
    } finally {
      if (!disposed) saving.value = false
    }
  }
  function clearPending() {
    try {
      recovery.clear()
    } catch {
      onlyMessage(t('Cashier.recoveryClearFailed'), 'warning')
    }
  }
  onMounted(() => {
    try {
      const pending = recovery.read()
      if (pending) {
        sourceRows.value = pending.preview.allocations.map((line) => ({
          line: {
            id: line.sourceLineId,
            version: pending.request.input.items.find((item) => item.id === line.sourceLineId)?.version || 0,
            paymentId: line.paymentId,
            receivableId: line.receivableId,
            fullName: line.fullName,
            customerName: line.customerName,
            subjectName: line.subjectName,
            amount: line.originalAmount,
            refundedAmount: line.refundedAmount,
            calcStartDate: '',
            calcEndDate: '',
            method: '',
            methodText: ''
          },
          paidAt: '',
          payerName: '',
          companyName: pending.preview.companyName
        }))
        Object.assign(model, pending.request.input)
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
    company,
    funding,
    available,
    sourceRows,
    files,
    uploading,
    invalidFiles,
    filesChanged,
    loading,
    calculating,
    saving,
    uncertain,
    recoveryFailed,
    preview,
    result,
    calculate,
    submit,
    invalidate
  }
}
