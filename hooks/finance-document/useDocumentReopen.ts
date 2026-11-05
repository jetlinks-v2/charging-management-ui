import { computed, onMounted, onScopeDispose, reactive, ref, toRef, watch } from 'vue'
import type { FormInstance } from 'ant-design-vue'
import {
  getDocument,
  previewDocumentReopen,
  confirmDocumentReopen,
  type DocumentRecord,
  type DocumentDetail,
  type DocumentBuyer,
  type DocumentReopenInput,
  type DocumentReopenPreview
} from '../../api/financeDocument'
import type { PaymentRecovery } from '../../api/paymentConfirmation'
import { usePaymentConfirmation } from '../finance-cashier/usePaymentConfirmation'
import { useDocumentRecovery } from './useDocumentRecovery'

/** 重开使用原票冻结来源，界面只提交购方纠错；未知结果沿原请求恢复，不重新读取或计税。 */
export function useDocumentReopen(
  props: { projectId: string; document: DocumentRecord },
  saved: () => void,
  recovery?: PaymentRecovery<DocumentReopenInput, DocumentReopenPreview>
) {
  const project = props.projectId
  const detail = ref<DocumentDetail>(),
    loading = ref(false),
    loadFailed = ref(false)
  const form = ref<FormInstance>(),
    step = ref(0),
    validating = ref(false)
  const buyer = reactive<DocumentBuyer>({ name: '', titleType: 'ENTERPRISE' })
  const invoiceType = ref<'1' | '2'>('1'),
    remark = ref('')
  // 表单必须使用稳定模型；临时对象会让字段在change校验时读到旧原因。
  const model = reactive({ buyer, reason: '' }),
    reason = toRef(model, 'reason')
  const original = ref<DocumentRecord>(props.document)
  let disposed = false,
    generation = 0
  const confirmation = usePaymentConfirmation<DocumentReopenInput, DocumentReopenPreview, DocumentDetail>(
    project,
    recovery || useDocumentRecovery<DocumentReopenInput, DocumentReopenPreview>(() => project, 'INVOICE', 'reopen'),
    saved,
    {
      preview: async (projectId, input) => ({
        ...(await previewDocumentReopen(projectId, input)),
        original: structuredClone({ ...original.value })
      }),
      confirm: confirmDocumentReopen
    },
    { unavailable: 'Document.recoveryUnavailable', clearFailed: 'Document.clearFailed', unknown: 'Document.unknown' }
  )
  const locked = computed(
    () =>
      confirmation.saving.value ||
      confirmation.uncertain.value ||
      confirmation.failed.value ||
      !!confirmation.result.value
  )
  const busy = computed(
    () => loading.value || validating.value || confirmation.calculating.value || confirmation.saving.value
  )
  const canClose = computed(() => !busy.value && !confirmation.uncertain.value && !confirmation.failed.value)
  const complete = computed(() => !!buyer.name.trim() && !!reason.value.trim() && reason.value.trim().length <= 500)
  async function load() {
    if (locked.value || loading.value) return
    const n = ++generation
    loading.value = true
    loadFailed.value = false
    try {
      const value = await getDocument(project, 'INVOICE', props.document.id)
      if (disposed || n !== generation) return
      detail.value = value
      original.value = value.document
      Object.assign(buyer, value.buyer)
      invoiceType.value = value.document.invoiceType === '2' ? '2' : '1'
      remark.value = value.document.remark || ''
    } catch (error) {
      if (!disposed && n === generation) {
        loadFailed.value = true
        confirmation.notify(error)
      }
    } finally {
      if (!disposed && n === generation) loading.value = false
    }
  }
  async function calculate() {
    if (locked.value || busy.value || !detail.value || !complete.value) return
    validating.value = true
    try {
      await form.value?.validate()
      await confirmation.calculate({
        id: original.value.id,
        version: original.value.version,
        buyer: { ...buyer },
        invoiceType: invoiceType.value,
        remark: remark.value,
        reason: reason.value.trim()
      })
      if (confirmation.preview.value) step.value = 1
    } catch (error) {
      if (!(error as { errorFields?: unknown })?.errorFields) confirmation.notify(error)
    } finally {
      validating.value = false
    }
  }
  watch([buyer, invoiceType, remark, reason], () => confirmation.invalidate(), { deep: true, flush: 'sync' })
  watch(confirmation.preview, (value) => {
    if (!value && !confirmation.uncertain.value && !confirmation.result.value) step.value = 0
  })
  function back() {
    if (locked.value || busy.value) return
    confirmation.invalidate()
    step.value = 0
  }
  onMounted(() => {
    const pending = confirmation.restore()
    if (!pending) {
      if (!confirmation.failed.value) void load()
      return
    }
    original.value = confirmation.preview.value!.original
    Object.assign(buyer, JSON.parse(JSON.stringify(pending.buyer)) as DocumentBuyer)
    invoiceType.value = pending.invoiceType
    remark.value = pending.remark || ''
    reason.value = pending.reason
    step.value = 1
  })
  onScopeDispose(() => {
    disposed = true
    generation++
  })
  return {
    ...confirmation,
    original,
    detail,
    form,
    step,
    buyer,
    invoiceType,
    remark,
    model,
    reason,
    loading,
    loadFailed,
    locked,
    busy,
    canClose,
    complete,
    calculate,
    back,
    load
  }
}
