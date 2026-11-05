import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { useUserStore } from '@jetlinks-web-core/store/user'
import { getApplicationAccessContext } from '@jetlinks-web-core/utils/request-context'
import { getApplicationRuntimeEntry } from '@jetlinks-web-core/utils/project-runtime'
import type { PendingPrepay, PrepayRecovery } from '../../api/financePrepay'

/** 与普通收款分开保存，按账号、租户、应用入口和项目隔离。 */
export function usePrepayRecovery(project: MaybeRefOrGetter<string>): PrepayRecovery {
  const user = useUserStore()
  const key = computed(
    () =>
      `charging:pending-prepay:${JSON.stringify([
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
      const value = JSON.parse(saved) as PendingPrepay
      if (
        value.projectId !== toValue(project) ||
        !value.spaceId ||
        !value.quote?.id ||
        !Number.isInteger(value.quote.version) ||
        !value.request?.requestId ||
        value.request.version !== value.quote.version ||
        !value.request.companyId ||
        !Array.isArray(value.request.tenders) ||
        !value.request.tenders.length ||
        !Array.isArray(value.funding)
      )
        throw new Error('Invalid pending prepayment')
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
