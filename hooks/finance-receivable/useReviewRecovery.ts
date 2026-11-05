import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { useUserStore } from '@jetlinks-web-core/store/user'
import { getApplicationAccessContext } from '@jetlinks-web-core/utils/request-context'
import { getApplicationRuntimeEntry } from '@jetlinks-web-core/utils/project-runtime'
import type { PaymentRecovery, PendingPayment } from '../../api/paymentConfirmation'
import type { ReceivableReviewInput, ReceivableReviewPreview } from '../../api/financeReceivable'

/** 审核成功记录在后端按原请求恢复；本地快照仅用于锁定确认范围和显示原账单。 */
export function useReviewRecovery(
  project: MaybeRefOrGetter<string>
): PaymentRecovery<ReceivableReviewInput, ReceivableReviewPreview> {
  const user = useUserStore()
  const key = computed(
    () =>
      `charging:pending-receivable-review:${JSON.stringify([
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
      const value = JSON.parse(raw) as PendingPayment<ReceivableReviewInput, ReceivableReviewPreview>
      const input = value.request?.input,
        rows = value.preview?.rows
      if (
        !value.request?.requestId ||
        !input ||
        !value.request.token ||
        value.request.token !== value.preview?.token ||
        value.request.token !== JSON.stringify(input) ||
        !['APPROVE', 'REJECT', 'UNAPPROVE'].includes(input.action) ||
        !input.reason?.trim() ||
        input.reason.length > 1000 ||
        !Array.isArray(input.items) ||
        !input.items.length ||
        input.items.length > 100 ||
        !Array.isArray(rows) ||
        rows.length !== input.items.length ||
        input.items.some(
          (item, index) =>
            !item?.id ||
            !Number.isSafeInteger(item.version) ||
            item.version < 0 ||
            input.items.findIndex((other) => other.id === item.id) !== index ||
            rows[index]?.id !== item.id ||
            rows[index]?.version !== item.version ||
            rows[index]?.projectId !== toValue(project)
        )
      )
        throw new Error('Invalid pending receivable review')
      return value
    },
    write(value) {
      window.sessionStorage.setItem(key.value, JSON.stringify(value))
    },
    clear() {
      window.sessionStorage.removeItem(key.value)
    }
  }
}
