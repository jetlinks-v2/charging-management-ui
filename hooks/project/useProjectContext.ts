import { effectScope, onScopeDispose, watch } from 'vue'
import { useUserStore } from '@jetlinks-web-core/store/user'
import { getApplicationAccessContext } from '@jetlinks-web-core/utils/request-context'
import { getApplicationRuntimeEntry } from '@jetlinks-web-core/utils/project-runtime'
import { getProjectOptions } from '../../api/project'
import { createProjectContext } from './createProjectContext'

let shared: ReturnType<typeof createProjectContext> | undefined
export function useProjectContext() {
  const user = useUserStore()
  const identity = () =>
    JSON.stringify([
      user.userInfo.id || '',
      getApplicationAccessContext().domain || '',
      getApplicationRuntimeEntry().applicationId || '',
      window.location.pathname.split('/')[1] || ''
    ])
  if (shared) return shared
  const context = createProjectContext({
    identity,
    load: async () => {
      const result = await getProjectOptions()
      if (result.status !== 'ready') throw new Error('Project source unavailable')
      return result.options
    },
    read: (key) => window.sessionStorage.getItem(key) || '',
    write: (key, value) => window.sessionStorage.setItem(key, value)
  })
  shared = context
  // 守卫随页面销毁，账号监听持续整个应用会话，避免首次页面关闭后失去账号隔离。
  effectScope(true).run(() => watch(identity, () => {
    context.reset()
    if (user.userInfo.id) void context.refresh().catch(() => {})
  }, { flush: 'sync' }))
  return context
}

/** 编辑和资金操作在结束前锁定项目，避免另一个应用页签切换上下文。 */
export function useProjectSwitchGuard(allowed: () => boolean) {
  const remove = useProjectContext().guard(allowed)
  onScopeDispose(remove)
}
