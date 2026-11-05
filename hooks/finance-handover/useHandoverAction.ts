import { computed, onMounted, ref } from 'vue'
import {
  actHandover,
  type HandoverRecord,
  type HandoverActionInput,
  type HandoverActionPreview
} from '../../api/financeHandover'
import { usePaymentConfirmation } from '../finance-cashier/usePaymentConfirmation'
import { useHandoverRecovery } from './useHandoverRecovery'

export function useHandoverAction(
  props: { projectId: string; batch: HandoverRecord; action: HandoverActionInput['action'] },
  saved: () => void
) {
  const reason = ref('')
  const confirmation = usePaymentConfirmation(
    props.projectId,
    useHandoverRecovery<HandoverActionInput, HandoverActionPreview>(() => props.projectId, 'action'),
    saved,
    {
      preview: async (_project, input) => ({
        token: JSON.stringify(input),
        batch: JSON.parse(JSON.stringify(props.batch)) as HandoverRecord
      }),
      confirm: actHandover
    },
    { unavailable: 'Document.recoveryUnavailable', clearFailed: 'Document.clearFailed', unknown: 'Handover.unknown' }
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
  async function submit() {
    if (confirmation.uncertain.value) return confirmation.submit()
    if (locked.value || !reason.value.trim() || reason.value.length > 1000) return
    await confirmation.calculate({
      id: props.batch.id,
      version: props.batch.version,
      action: props.action,
      reason: reason.value.trim()
    })
    await confirmation.submit()
  }
  onMounted(() => {
    const restored = confirmation.restore()
    if (restored) reason.value = restored.reason
  })
  return { reason, ...confirmation, locked, canClose, submit }
}
