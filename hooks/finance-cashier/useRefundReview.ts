import { onMounted, ref, watch, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { onlyMessage } from '@jetlinks-web/utils'
import {
  reviewRefundApplication,
  type RefundApplicationView,
  type RefundReviewInput
} from '../../api/financeRefundApplication'
import { useFinanceBatchRecovery } from '../finance-handover/useFinanceBatchRecovery'
import { paymentRequestId } from '../../utils/paymentRequest'
import { requestErrorMessage } from '../../utils/requestError'

interface ReviewInput {
  items: { id: string; input: RefundReviewInput }[]
  reason: string
}
export function useRefundReview(projectId: Readonly<Ref<string>>, reload: () => void) {
  const { t } = useI18n()
  const target = ref<RefundApplicationView>(),
    action = ref<'approve' | 'reject'>('approve'),
    reason = ref('')
  const targets = ref<RefundApplicationView[]>([]),
    selected = ref<RefundApplicationView[]>([])
  const saving = ref(false),
    uncertain = ref(false),
    recoveryFailed = ref(false)
  const results = ref<{ id: string; success: boolean; message?: string }[]>([])
  const recovery = useFinanceBatchRecovery<ReviewInput>(projectId, 'refund')
  let submission: ReviewInput | undefined
  const notify = (error: unknown) => onlyMessage(requestErrorMessage(error, t('Finance.failed')), 'error')
  function start(row: RefundApplicationView | RefundApplicationView[], value: 'approve' | 'reject') {
    if (saving.value || uncertain.value || recoveryFailed.value) return
    const rows = Array.isArray(row) ? row : [row]
    const unique = [...new Map(rows.map((r) => [r.line.applicationId, r])).values()]
    if (!unique.length || unique.length > 100 || unique.some((r) => r.status !== 'PENDING')) return
    targets.value = unique
    target.value = unique[0]
    action.value = value
    reason.value = ''
    submission = undefined
    results.value = []
  }
  async function submit() {
    if (!target.value || saving.value || !reason.value.trim() || recoveryFailed.value) return
    submission ||= {
      reason: reason.value.trim(),
      items: targets.value.map((r) => ({
        id: r.line.applicationId,
        input: { requestId: paymentRequestId(), version: r.version, reason: reason.value.trim() }
      }))
    }
    try {
      recovery.write(action.value, submission)
    } catch {
      onlyMessage(t('Refund.recoveryUnavailable'), 'error')
      return
    }
    saving.value = true
    uncertain.value = false
    results.value = []
    try {
      for (const item of submission.items) {
        try {
          await reviewRefundApplication(projectId.value, item.id, action.value, item.input)
          results.value.push({ id: item.id, success: true })
        } catch (error) {
          const status = (error as { response?: { status?: number } }).response?.status
          if (!status || status >= 500) {
            uncertain.value = true
            notify(error)
            break
          }
          notify(error)
          results.value.push({ id: item.id, success: false, message: requestErrorMessage(error, t('Finance.failed')) })
        }
      }
      if (!uncertain.value) {
        recovery.clear()
        submission = undefined
        if (results.value.every((r) => r.success)) {
          target.value = undefined
          selected.value = []
          onlyMessage(t('Finance.saved'), 'success')
        }
      }
      reload()
    } catch (error) {
      uncertain.value = true
      notify(error)
    } finally {
      saving.value = false
    }
  }
  function restore() {
    try {
      const saved = recovery.read()
      if (!saved) return
      if (
        !['approve', 'reject'].includes(saved.action) ||
        saved.input.items.length > 100 ||
        saved.input.items.some(
          (item) => !item.id || !item.input?.requestId || !Number.isSafeInteger(item.input.version)
        )
      )
        throw Error('Invalid refund recovery')
      submission = saved.input
      action.value = saved.action as 'approve' | 'reject'
      reason.value = saved.input.reason
      targets.value = saved.input.items.map(
        (item) =>
          ({
            number: item.id,
            version: item.input.version,
            line: { applicationId: item.id },
            status: 'PENDING'
          }) as RefundApplicationView
      )
      target.value = targets.value[0]
      uncertain.value = true
    } catch {
      recoveryFailed.value = true
      onlyMessage(t('Refund.recoveryUnavailable'), 'error')
    }
  }
  function cancel() {
    if (!saving.value && !uncertain.value) {
      target.value = undefined
      results.value = []
    }
  }
  onMounted(restore)
  watch(projectId, () => {
    target.value = undefined
    selected.value = []
    uncertain.value = false
    recoveryFailed.value = false
    submission = undefined
    restore()
  })
  return {
    target,
    targets,
    selected,
    action,
    reason,
    saving,
    uncertain,
    recoveryFailed,
    results,
    start,
    submit,
    cancel
  }
}
