import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { useUserStore } from '@jetlinks-web-core/store/user'
import { getApplicationAccessContext } from '@jetlinks-web-core/utils/request-context'
import { getApplicationRuntimeEntry } from '@jetlinks-web-core/utils/project-runtime'

/** 批量确认按租户、账号、应用及项目隔离；未知结果只重试原对象和请求号。 */
export function useFinanceBatchRecovery<Input>(
  project: MaybeRefOrGetter<string>,
  kind: 'handover' | 'closing' | 'refund'
) {
  const user = useUserStore()
  const key = computed(
    () =>
      `charging:batch:${JSON.stringify([
        user.userInfo.id || '',
        getApplicationAccessContext().domain || '',
        getApplicationRuntimeEntry().applicationId || '',
        window.location.pathname.split('/')[1] || '',
        toValue(project),
        kind
      ])}`
  )
  return {
    read(): { action: string; input: Input } | undefined {
      const raw = window.sessionStorage.getItem(key.value)
      if (!raw) return
      const value = JSON.parse(raw)
      if (!value?.input?.items?.length || !value.input.reason?.trim() || !value.action)
        throw Error('Invalid batch recovery')
      return value
    },
    write(action: string, input: Input) {
      window.sessionStorage.setItem(key.value, JSON.stringify({ action, input }))
    },
    clear() {
      window.sessionStorage.removeItem(key.value)
    }
  }
}
