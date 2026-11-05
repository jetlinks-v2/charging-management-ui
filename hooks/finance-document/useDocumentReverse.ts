import { computed, onMounted, reactive, toRef } from 'vue'
import { usePaymentConfirmation } from '../finance-cashier/usePaymentConfirmation'
import { useDocumentRecovery } from './useDocumentRecovery'
import {
  reverseDocument,
  type DocumentRecord,
  type DocumentReverseInput,
  type DocumentReversePreview
} from '../../api/financeDocument'
import type { PaymentRecovery } from '../../api/paymentConfirmation'

export function useDocumentReverse(
  props: { projectId: string; document: DocumentRecord },
  saved: () => void,
  recovery?: PaymentRecovery<DocumentReverseInput, DocumentReversePreview>
) {
  const model = reactive({ reason: '' })
  const reason = toRef(model, 'reason')
  const type = props.document.documentType
  const confirmation = usePaymentConfirmation(
    props.projectId,
    recovery ||
      useDocumentRecovery<DocumentReverseInput, DocumentReversePreview>(() => props.projectId, type, 'reverse'),
    saved,
    {
      // 红冲没有计税预览：此本地信封仅冻结原版本/原因，服务端仍执行版本、权限及状态校验。
      preview: async (inputProject, input) => ({
        token: JSON.stringify([inputProject, input]),
        document: JSON.parse(JSON.stringify(props.document)) as DocumentRecord
      }),
      confirm: (project, request) => reverseDocument(project, type, request)
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
  const canClose = computed(
    () =>
      !confirmation.saving.value &&
      !confirmation.calculating.value &&
      !confirmation.uncertain.value &&
      !confirmation.failed.value
  )
  async function submit() {
    if (
      confirmation.saving.value ||
      confirmation.calculating.value ||
      confirmation.failed.value ||
      confirmation.result.value
    )
      return
    if (confirmation.uncertain.value) {
      await confirmation.submit()
      return
    }
    if (!reason.value.trim() || reason.value.trim().length > 500) return
    await confirmation.calculate({
      id: props.document.id,
      version: props.document.version,
      reason: reason.value.trim()
    })
    await confirmation.submit()
  }
  onMounted(() => {
    const restored = confirmation.restore()
    if (restored) reason.value = restored.reason
  })
  return { ...confirmation, model, reason, locked, canClose, submit }
}
