import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { usePaymentConfirmation } from '../finance-cashier/usePaymentConfirmation'
import { useClosingRecovery } from './useClosingRecovery'
import { previewClosing, confirmClosing, type AccountingPeriod, type ClosingAction } from '../../api/financeAccounting'

export function useClosingConfirmation(
  props: { projectId: string; period: AccountingPeriod; action: ClosingAction },
  saved: () => void
) {
  const { t } = useI18n()
  const reason = ref('')
  const state = usePaymentConfirmation(
    props.projectId,
    useClosingRecovery(() => props.projectId),
    saved,
    {
      preview: async (project, input) => {
        const value = await previewClosing(project, input)
        if (value.version !== input.version || value.month !== input.month || value.action !== input.action)
          throw new Error(t('MonthClosing.previewChanged'))
        return value
      },
      confirm: confirmClosing
    },
    {
      unavailable: 'Document.recoveryUnavailable',
      clearFailed: 'Document.clearFailed',
      unknown: 'MonthClosing.unknown'
    }
  )
  const locked = computed(
    () =>
      state.saving.value ||
      state.calculating.value ||
      state.uncertain.value ||
      state.failed.value ||
      !!state.result.value
  )
  const canClose = computed(
    () => !state.saving.value && !state.calculating.value && !state.uncertain.value && !state.failed.value
  )
  const ready = computed(
    () =>
      !!state.preview.value &&
      (props.action === 'REOPEN' ||
        (state.preview.value.unhandedCount === 0 &&
          state.preview.value.pendingHandoverCount === 0 &&
          (!state.preview.value.requireReceivableReview || state.preview.value.pendingReceivableCount === 0)))
  )
  async function calculate() {
    if (locked.value || !reason.value.trim() || reason.value.length > 1000) return
    await state.calculate({
      month: props.period.accountMonth,
      action: props.action,
      version: props.period.version,
      reason: reason.value.trim()
    })
  }
  watch(reason, () => {
    if (!locked.value) state.invalidate()
  })
  onMounted(() => {
    const input = state.restore()
    if (input) reason.value = input.reason
  })
  return { ...state, reason, locked, canClose, ready, calculate }
}
