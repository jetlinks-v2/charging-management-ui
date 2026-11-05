import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { useUserStore } from '@jetlinks-web-core/store/user'
import { getApplicationAccessContext } from '@jetlinks-web-core/utils/request-context'
import { getApplicationRuntimeEntry } from '@jetlinks-web-core/utils/project-runtime'
import type { PaymentRecovery, PendingPayment } from '../../api/paymentConfirmation'
import type { ClosingInput, ClosingPreview } from '../../api/financeAccounting'

/** 恢复绑定原月份、动作、版本及完整预览；不能用新页面的日期或版本替换未知结果。 */
export function useClosingRecovery(project: MaybeRefOrGetter<string>): PaymentRecovery<ClosingInput, ClosingPreview> {
  const user = useUserStore()
  const key = computed(
    () =>
      `charging:pending-month-closing:${JSON.stringify([
        user.userInfo.id || '',
        getApplicationAccessContext().domain || '',
        getApplicationRuntimeEntry().applicationId || '',
        window.location.pathname.split('/')[1] || '',
        toValue(project)
      ])}`
  )
  return {
    read() {
      const raw = window.sessionStorage.getItem(key.value)
      if (!raw) return undefined
      const data = JSON.parse(raw) as PendingPayment<ClosingInput, ClosingPreview>
      const input = data.request?.input,
        preview = data.preview
      if (
        !data.request?.requestId ||
        !data.request.token ||
        data.request.token !== preview?.token ||
        !input ||
        !/^[0-9]{4}-(0[1-9]|1[0-2])$/.test(input.month) ||
        input.month.startsWith('0000') ||
        !['CLOSE', 'REOPEN'].includes(input.action) ||
        !input.reason?.trim() ||
        input.reason.length > 1000 ||
        !Number.isSafeInteger(input.version) ||
        input.version < 0 ||
        preview.month !== input.month ||
        preview.action !== input.action ||
        preview.version !== input.version ||
        ['sourceCount', 'receivableCount', 'pendingReceivableCount', 'unhandedCount', 'pendingHandoverCount'].some(
          (field) =>
            !Number.isSafeInteger(preview[field as keyof ClosingPreview]) ||
            Number(preview[field as keyof ClosingPreview]) < 0
        ) ||
        typeof preview.requireReceivableReview !== 'boolean' ||
        ![preview.amount, preview.cashAmount].every(
          (value) => typeof value === 'string' && /^-?\d+\.\d{2}$/.test(value)
        )
      )
        throw new Error('Invalid pending month closing')
      return data
    },
    write(value) {
      window.sessionStorage.setItem(key.value, JSON.stringify(value))
    },
    clear() {
      window.sessionStorage.removeItem(key.value)
    }
  }
}
