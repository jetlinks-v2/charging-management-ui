import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { useUserStore } from '@jetlinks-web-core/store/user'
import { getApplicationAccessContext } from '@jetlinks-web-core/utils/request-context'
import { getApplicationRuntimeEntry } from '@jetlinks-web-core/utils/project-runtime'
import type { PaymentRecovery, PendingPayment } from '../../api/paymentConfirmation'
import type {
  HandoverInput,
  HandoverPreview,
  HandoverActionInput,
  HandoverActionPreview
} from '../../api/financeHandover'

/** 交账恢复按账号、租户、运行入口、项目及动作隔离，存储不可用时不发确认请求。 */
export function useHandoverRecovery<
  I extends HandoverInput | HandoverActionInput,
  P extends HandoverPreview | HandoverActionPreview
>(project: MaybeRefOrGetter<string>, action: 'create' | 'action'): PaymentRecovery<I, P> {
  const user = useUserStore()
  const key = computed(
    () =>
      `charging:pending-handover:${JSON.stringify([
        user.userInfo.id || '',
        getApplicationAccessContext().domain || '',
        getApplicationRuntimeEntry().applicationId || '',
        window.location.pathname.split('/')[1] || '',
        toValue(project),
        action
      ])}`
  )
  return {
    read() {
      const raw = window.sessionStorage.getItem(key.value)
      if (!raw) return undefined
      const data = JSON.parse(raw) as PendingPayment<I, P>
      if (
        !data.request?.requestId ||
        !data.request.input ||
        !data.preview?.token ||
        data.preview.token !== data.request.token
      )
        throw new Error('Invalid pending handover')
      if (action === 'create') {
        const input = data.request.input as HandoverInput,
          preview = data.preview as HandoverPreview
        if (
          !Array.isArray(input.items) ||
          !input.items.length ||
          input.items.length > 100 ||
          !Array.isArray(preview.lines) ||
          !preview.lines.length ||
          preview.sourceCount !== input.items.length ||
          input.items.some(
            (item, index) =>
              !item?.id ||
              !['PAYMENT', 'REFUND', 'FUND'].includes(item.type) ||
              !Number.isSafeInteger(item.version) ||
              item.version < 0 ||
              input.items.findIndex((v) => v.id === item.id && v.type === item.type) !== index ||
              !preview.lines.some((l) => l.sourceId === item.id && l.sourceType === item.type)
          )
        )
          throw new Error('Invalid handover scope')
      } else {
        const input = data.request.input as HandoverActionInput,
          preview = data.preview as HandoverActionPreview
        if (
          !input.id ||
          !['APPROVE', 'REJECT', 'UNAPPROVE', 'CANCEL'].includes(input.action) ||
          !input.reason?.trim() ||
          !preview.batch ||
          preview.batch.id !== input.id ||
          preview.batch.version !== input.version ||
          preview.batch.projectId !== toValue(project)
        )
          throw new Error('Invalid handover action scope')
      }
      return data
    },
    write(data) {
      window.sessionStorage.setItem(key.value, JSON.stringify(data))
    },
    clear() {
      window.sessionStorage.removeItem(key.value)
    }
  }
}
