import { computed, onMounted, ref } from 'vue'
import {
  verifyReceipts,
  type DocumentRecord,
  type ReceiptVerificationInput,
  type ReceiptVerificationPreview
} from '../../api/financeDocument'
import type { PaymentRecovery } from '../../api/paymentConfirmation'
import { usePaymentConfirmation } from '../finance-cashier/usePaymentConfirmation'
import { useDocumentRecovery } from './useDocumentRecovery'

/** 复用原请求恢复：断网后冻结整批票号和版本，不以新的列表数据替换待确认载荷。 */
export function useReceiptVerification(
  props: { projectId: string; documents: DocumentRecord[] },
  saved: () => void,
  recovery?: PaymentRecovery<ReceiptVerificationInput, ReceiptVerificationPreview>
) {
  const remark = ref('')
  const confirmation = usePaymentConfirmation(
    props.projectId,
    recovery ||
      useDocumentRecovery<ReceiptVerificationInput, ReceiptVerificationPreview>(
        () => props.projectId,
        'RECEIPT',
        'verify'
      ),
    saved,
    {
      preview: async (project, input) => ({
        token: JSON.stringify([project, input]),
        documents: JSON.parse(JSON.stringify(props.documents)) as DocumentRecord[]
      }),
      confirm: verifyReceipts
    },
    { unavailable: 'Document.recoveryUnavailable', clearFailed: 'Document.clearFailed', unknown: 'Document.unknown' }
  )
  const locked = computed(
    () =>
      confirmation.saving.value ||
      confirmation.calculating.value ||
      confirmation.uncertain.value ||
      confirmation.failed.value ||
      !!confirmation.result.value
  )
  const canClose = computed(
    () =>
      !confirmation.saving.value &&
      !confirmation.calculating.value &&
      !confirmation.uncertain.value &&
      !confirmation.failed.value
  )
  const documents = computed(() => confirmation.preview.value?.documents || props.documents)
  async function submit() {
    if (
      confirmation.saving.value ||
      confirmation.calculating.value ||
      confirmation.failed.value ||
      confirmation.result.value
    )
      return
    if (confirmation.uncertain.value) return confirmation.submit()
    if (!props.documents.length || props.documents.length > 100 || remark.value.trim().length > 200) return
    await confirmation.calculate({
      items: props.documents.map((row) => ({ id: row.id, version: row.version })),
      remark: remark.value.trim() || undefined
    })
    await confirmation.submit()
  }
  onMounted(() => {
    const restored = confirmation.restore()
    if (restored) remark.value = restored.remark || ''
  })
  return { ...confirmation, remark, documents, locked, canClose, submit }
}
