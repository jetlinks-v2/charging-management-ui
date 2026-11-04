import { shallowRef, ref, onScopeDispose } from 'vue'
import { useI18n } from 'vue-i18n'
import { onlyMessage } from '@jetlinks-web/utils'
import type { PaymentRecovery, PaymentRequest } from '../../api/paymentConfirmation'
import { paymentRequestId } from '../../utils/paymentRequest'
import { requestErrorMessage } from '../../utils/requestError'
/** 未知结果保持原请求号；存储失败时不发送资金请求。 */
export function usePaymentConfirmation<I, P extends { token: string }, R>(
  project: string,
  recovery: PaymentRecovery<I, P>,
  saved: () => void,
  api: {
    preview: (project: string, input: I) => Promise<P>
    confirm: (project: string, request: PaymentRequest<I>) => Promise<R>
  },
  messages: { unavailable: string; clearFailed: string; unknown: string }
) {
  const { t } = useI18n()
  const preview = shallowRef<P>(),
    result = shallowRef<R>(),
    calculating = ref(false),
    saving = ref(false),
    uncertain = ref(false),
    failed = ref(false)
  let request: PaymentRequest<I> | undefined,
    token = 0,
    disposed = false
  const notify = (e: unknown) => onlyMessage(requestErrorMessage(e, t('Finance.failed')), 'error')
  function invalidate() {
    if (!uncertain.value) {
      ++token
      preview.value = undefined
      request = undefined
    }
  }
  function restore() {
    try {
      const pending = recovery.read()
      if (!pending) return undefined
      preview.value = pending.preview
      request = pending.request
      uncertain.value = true
      return pending.request.input
    } catch {
      failed.value = true
      onlyMessage(t(messages.unavailable), 'error')
      return undefined
    }
  }
  async function calculate(input: I) {
    if (calculating.value || saving.value || uncertain.value || failed.value) return
    invalidate()
    const n = token
    calculating.value = true
    try {
      const v = await api.preview(project, input)
      if (!disposed && n === token) {
        preview.value = v
        request = { requestId: paymentRequestId(), token: v.token, input: JSON.parse(JSON.stringify(input)) }
      }
    } catch (e) {
      if (!disposed && n === token) notify(e)
    } finally {
      if (!disposed) calculating.value = false
    }
  }
  function clear() {
    try {
      recovery.clear()
    } catch {
      onlyMessage(t(messages.clearFailed), 'warning')
    }
  }
  async function submit() {
    if (!request || !preview.value || saving.value || result.value) return
    saving.value = true
    try {
      recovery.write({ request, preview: preview.value })
    } catch {
      saving.value = false
      onlyMessage(t(messages.unavailable), 'error')
      return
    }
    try {
      const v = await api.confirm(project, request)
      if (!disposed) {
        result.value = v
        uncertain.value = false
        clear()
        saved()
      }
    } catch (e) {
      if (!disposed) {
        const status = (e as { response?: { status?: number } })?.response?.status
        if (status && status >= 400 && status < 500 && !uncertain.value) {
          clear()
          invalidate()
          notify(e)
        } else {
          uncertain.value = true
          onlyMessage(t(messages.unknown), 'warning')
        }
      }
    } finally {
      if (!disposed) saving.value = false
    }
  }
  onScopeDispose(() => {
    disposed = true
    ++token
  })
  return { preview, result, calculating, saving, uncertain, failed, invalidate, restore, calculate, submit, notify }
}
