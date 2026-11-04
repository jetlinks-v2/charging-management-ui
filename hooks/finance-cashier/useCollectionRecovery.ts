import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { useUserStore } from '@jetlinks-web-core/store/user'
import { getApplicationAccessContext } from '@jetlinks-web-core/utils/request-context'
import { getApplicationRuntimeEntry } from '@jetlinks-web-core/utils/project-runtime'
import type { CollectionRecovery, PendingCollection } from '../../api/financeCashier'

/** 仅保留当前浏览器会话中未确认结果的原收款请求，按账号、租户、应用及项目隔离。 */
export function useCollectionRecovery(project: MaybeRefOrGetter<string>): CollectionRecovery {
  const user = useUserStore()
  const key = computed(
    () =>
      `charging:pending-payment:${JSON.stringify([
        user.userInfo.id || '',
        getApplicationAccessContext().domain || '',
        getApplicationRuntimeEntry().applicationId || '',
        window.location.pathname.split('/')[1] || '',
        toValue(project)
      ])}`
  )
  return {
    read() {
      const saved = window.sessionStorage.getItem(key.value)
      if (!saved) return undefined
      const value = JSON.parse(saved) as PendingCollection
      if (
        !value.request?.requestId ||
        !value.request.input?.items?.length ||
        !value.preview?.token ||
        value.request.token !== value.preview.token
      )
        throw new Error('Invalid pending payment')
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
