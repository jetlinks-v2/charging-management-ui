import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { useUserStore } from '@jetlinks-web-core/store/user'
import { getApplicationAccessContext } from '@jetlinks-web-core/utils/request-context'
import { getApplicationRuntimeEntry } from '@jetlinks-web-core/utils/project-runtime'
import type { FundRecovery, PendingFund } from '../../api/financeFunds'

/** 待确认资金操作按当前会话身份和项目隔离，重试沿用原请求号。 */
export function useFundRecovery(project: MaybeRefOrGetter<string>): FundRecovery {
  const user = useUserStore()
  const key = computed(
    () =>
      `charging:pending-fund:${JSON.stringify([
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
      const value = JSON.parse(saved) as PendingFund
      if (
        !value.request?.requestId ||
        !value.request.input?.action ||
        !value.preview?.token ||
        value.request.token !== value.preview.token
      )
        throw new Error('Invalid pending funds')
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
