import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { onlyMessage } from '@jetlinks-web/utils'
import { useProjectSwitchGuard } from '../project/useProjectContext'
import { useReviewRecovery } from './useReviewRecovery'
import { usePaymentConfirmation } from '../finance-cashier/usePaymentConfirmation'
import {
  reviewReceivables,
  type Receivable,
  type ReceivableReviewAction,
  type ReceivableReviewInput,
  type ReceivableReviewPreview,
  type ReceivableReviewResult
} from '../../api/financeReceivable'

export function useReceivableReview(props: { projectId: string }, saved: () => void) {
  const { t } = useI18n(),
    targets = ref<Receivable[]>([]),
    action = ref<ReceivableReviewAction>('APPROVE')
  const open = ref(false),
    pending = ref(false),
    recoveryFailed = ref(false)
  const recovery = useReviewRecovery(() => props.projectId)
  // 每次打开创建新的确认作用域，成功后的result不复用于下一批。
  const generation = ref(0)
  function check() {
    try {
      pending.value = !!recovery.read()
      recoveryFailed.value = false
    } catch {
      recoveryFailed.value = true
      onlyMessage(t('Document.recoveryUnavailable'), 'error')
    }
  }
  const blocked = computed(() => open.value || pending.value || recoveryFailed.value)
  function start(rows: Receivable[], value: ReceivableReviewAction) {
    if (
      blocked.value ||
      !props.projectId ||
      !rows.length ||
      rows.length > 100 ||
      rows.some(
        (row, index) =>
          row.projectId !== props.projectId ||
          !row.allowedOperations.includes(value) ||
          !row.id ||
          !Number.isSafeInteger(row.version) ||
          row.version < 0 ||
          rows.findIndex((other) => other.id === row.id) !== index
      )
    )
      return
    targets.value = JSON.parse(JSON.stringify(rows))
    action.value = value
    ++generation.value
    open.value = true
  }
  function recover() {
    try {
      const value = recovery.read()
      if (!value) return
      targets.value = value.preview.rows
      action.value = value.request.input.action
      ++generation.value
      open.value = true
    } catch {
      recoveryFailed.value = true
      onlyMessage(t('Document.recoveryUnavailable'), 'error')
    }
  }
  function close() {
    open.value = false
    targets.value = []
    check()
  }
  useProjectSwitchGuard(() => !blocked.value)
  watch(() => props.projectId, check, { immediate: true })
  return { open, pending, recoveryFailed, targets, action, generation, blocked, start, recover, close, saved }
}

export function useReviewConfirmation(
  props: { projectId: string; rows: Receivable[]; action: ReceivableReviewAction },
  saved: () => void
) {
  const reason = ref('')
  const state = usePaymentConfirmation<ReceivableReviewInput, ReceivableReviewPreview, ReceivableReviewResult[]>(
    props.projectId,
    useReviewRecovery(() => props.projectId),
    saved,
    {
      preview: async (_project, input) => ({
        token: JSON.stringify(input),
        rows: JSON.parse(JSON.stringify(props.rows))
      }),
      confirm: reviewReceivables
    },
    {
      unavailable: 'Document.recoveryUnavailable',
      clearFailed: 'Document.clearFailed',
      unknown: 'ReceivableReview.unknown'
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
  async function submit() {
    if (state.uncertain.value) return state.submit()
    if (locked.value || !reason.value.trim() || reason.value.length > 1000) return
    await state.calculate({
      items: props.rows.map((row) => ({ id: row.id, version: row.version })),
      action: props.action,
      reason: reason.value.trim()
    })
    await state.submit()
  }
  const restored = state.restore()
  if (restored) reason.value = restored.reason
  return { ...state, reason, locked, canClose, submit }
}
