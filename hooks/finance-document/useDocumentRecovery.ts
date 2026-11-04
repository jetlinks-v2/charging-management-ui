import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { useUserStore } from '@jetlinks-web-core/store/user'
import { getApplicationAccessContext } from '@jetlinks-web-core/utils/request-context'
import { getApplicationRuntimeEntry } from '@jetlinks-web-core/utils/project-runtime'
import type { DocumentType } from '../../api/financeDocument'
import type { PaymentRecovery, PendingPayment } from '../../api/paymentConfirmation'

/** 开具与红冲分别按账号/租户/应用/项目/票据类型隔离，仅保存待确认原请求。 */
export function useDocumentRecovery<I, P extends { token: string }>(
  project: MaybeRefOrGetter<string>,
  type: DocumentType,
  action: 'issue' | 'reverse' | 'reopen'
): PaymentRecovery<I, P> {
  const user = useUserStore()
  const key = computed(
    () =>
      `charging:pending-document:${JSON.stringify([
        user.userInfo.id || '',
        getApplicationAccessContext().domain || '',
        getApplicationRuntimeEntry().applicationId || '',
        window.location.pathname.split('/')[1] || '',
        toValue(project),
        type,
        action
      ])}`
  )
  return {
    read() {
      const saved = window.sessionStorage.getItem(key.value)
      if (!saved) return undefined
      const value = JSON.parse(saved) as PendingPayment<I, P>
      if (
        !value.request?.requestId ||
        !value.request.input ||
        !value.preview?.token ||
        value.request.token !== value.preview.token
      )
        throw new Error('Invalid pending document')
      const input = value.request.input as {
        documentType?: string
        items?: unknown[]
        id?: string
        version?: number
        reason?: string
      }
      const preview = value.preview as P & {
        documentType?: string
        document?: { id?: string; version?: number; documentType?: string }
        original?: { id?: string; version?: number; documentType?: string }
      }
      if (
        action === 'issue'
          ? input.documentType !== type || preview.documentType !== type || !input.items?.length
          : action === 'reopen'
            ? type !== 'INVOICE' ||
              preview.documentType !== type ||
              preview.original?.documentType !== type ||
              preview.original?.id !== input.id ||
              preview.original?.version !== input.version ||
              !input.reason?.trim()
            : preview.document?.documentType !== type ||
              preview.document.id !== input.id ||
              preview.document.version !== input.version ||
              !input.reason?.trim()
      )
        throw new Error('Invalid document scope')
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
