import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { FormInstance } from 'ant-design-vue'
import {
  previewDocument,
  confirmDocument,
  type DocumentType,
  type DocumentBuyer,
  type DocumentCandidate,
  type DocumentItem,
  type DocumentInput,
  type DocumentPreview
} from '../../api/financeDocument'
import type { PaymentRecovery } from '../../api/paymentConfirmation'
import {
  documentSourceKey,
  canSelectDocument,
  documentItem,
  validDocumentAmount,
  validDocumentDeduction
} from '../../utils/documentSelection'
import { usePaymentConfirmation } from '../finance-cashier/usePaymentConfirmation'
import { useDocumentRecovery } from './useDocumentRecovery'

export function useDocumentEditor(
  props: { projectId: string; type: DocumentType },
  saved: () => void,
  recovery?: PaymentRecovery<DocumentInput, DocumentPreview>
) {
  const { t } = useI18n()
  const form = ref<FormInstance>(),
    step = ref(0),
    validating = ref(false)
  const selected = ref<DocumentCandidate[]>([]),
    items = ref<DocumentItem[]>([])
  const buyer = reactive<DocumentBuyer>({ name: '' })
  const invoiceType = ref<'1' | '2'>('1'),
    remark = ref('')
  const confirmation = usePaymentConfirmation(
    props.projectId,
    recovery || useDocumentRecovery<DocumentInput, DocumentPreview>(() => props.projectId, props.type, 'issue'),
    saved,
    { preview: previewDocument, confirm: confirmDocument },
    {
      unavailable: 'Document.recoveryUnavailable',
      clearFailed: 'Document.clearFailed',
      unknown: 'Document.unknown'
    }
  )
  const locked = computed(
    () =>
      confirmation.uncertain.value ||
      confirmation.failed.value ||
      confirmation.saving.value ||
      !!confirmation.result.value
  )
  const busy = computed(() => validating.value || confirmation.calculating.value || confirmation.saving.value)
  const canClose = computed(() => !busy.value && !confirmation.uncertain.value && !confirmation.failed.value)
  const complete = computed(
    () =>
      !!selected.value.length &&
      items.value.length === selected.value.length &&
      items.value.every((item, i) => validDocumentAmount(item, selected.value[i]) && validDocumentDeduction(item))
  )
  function toggle(row: DocumentCandidate) {
    if (locked.value || busy.value) return
    const index = selected.value.findIndex((v) => documentSourceKey(v) === documentSourceKey(row))
    if (index >= 0) {
      selected.value.splice(index, 1)
      items.value.splice(index, 1)
      return
    }
    if (!canSelectDocument(row, selected.value) || selected.value.length >= 1000) return
    selected.value.push(row)
    items.value.push(documentItem(row))
    if (!buyer.name) buyer.name = row.customerName
  }
  function input(): DocumentInput {
    return {
      documentType: props.type,
      companyId: selected.value[0].companyId,
      buyer: { ...buyer },
      invoiceType: props.type === 'INVOICE' ? invoiceType.value : undefined,
      remark: remark.value,
      items: items.value.map((v) => ({ ...v, voucher: v.voucher ? { ...v.voucher } : undefined }))
    }
  }
  async function calculate() {
    if (locked.value || busy.value || !complete.value || !buyer.name.trim()) return
    validating.value = true
    try {
      await form.value?.validate()
      await confirmation.calculate(input())
      if (confirmation.preview.value) step.value = 2
    } catch (error) {
      if (!(error as { errorFields?: unknown })?.errorFields) confirmation.notify(error)
    } finally {
      validating.value = false
    }
  }
  // 输入改变立即废弃预览；未知结果只恢复原请求，不能改来源或重新计税后提交。
  watch([buyer, items, invoiceType, remark], () => confirmation.invalidate(), { deep: true, flush: 'sync' })
  watch([confirmation.preview, confirmation.saving, confirmation.calculating], () => {
    if (
      step.value === 2 &&
      !confirmation.preview.value &&
      !confirmation.saving.value &&
      !confirmation.calculating.value &&
      !confirmation.uncertain.value &&
      !confirmation.result.value
    )
      step.value = 1
  })
  function back() {
    if (locked.value || busy.value) return
    step.value = Math.max(0, step.value - 1)
    confirmation.invalidate()
  }
  onMounted(() => {
    const restored = confirmation.restore()
    if (!restored) return
    Object.assign(buyer, restored.buyer)
    // 表单与待恢复请求分离，重挂载后的本地状态也不能改写原确认载荷。
    items.value = JSON.parse(JSON.stringify(restored.items)) as DocumentItem[]
    invoiceType.value = restored.invoiceType || '1'
    remark.value = restored.remark || ''
    const preview = confirmation.preview.value!
    selected.value = preview.lines.map((line) => ({
      ...line,
      companyId: preview.companyId,
      companyName: preview.companyName,
      allowedAmount: line.availableAmount,
      paidAmount: '0.00',
      selectable: true
    }))
    step.value = 2
  })
  return {
    ...confirmation,
    form,
    step,
    selected,
    items,
    buyer,
    invoiceType,
    remark,
    locked,
    busy,
    canClose,
    complete,
    toggle,
    calculate,
    back,
    t
  }
}
