import { computed, onMounted, ref, watch } from 'vue'
import { useUserStore } from '@jetlinks-web-core/store/user'
import { getApplicationAccessContext } from '@jetlinks-web-core/utils/request-context'
import { getApplicationRuntimeEntry } from '@jetlinks-web-core/utils/project-runtime'
import { onlyMessage } from '@jetlinks-web/utils'
import { useI18n } from 'vue-i18n'
import { useProjectContext } from '../project/useProjectContext'

/** 概览选择与业务单项目、报表范围独立；持久化偏好必须经当前账号授权列表核验。 */
export function useOverviewProjects() {
  const context = useProjectContext(),
    user = useUserStore(),
    { t } = useI18n()
  const ids = ref<string[]>([]),
    open = ref(false)
  const key = computed(() =>
    JSON.stringify([
      user.userInfo.id || '',
      getApplicationAccessContext().domain || '',
      getApplicationRuntimeEntry().applicationId || '',
      window.location.pathname.split('/')[1] || ''
    ])
  )
  let restored = false
  const storageKey = () => 'property:charging:overview:' + key.value
  const label = computed(() =>
    context.projects.value
      .filter((p) => ids.value.includes(p.id))
      .map((p) => p.name)
      .join('、')
  )
  function remember() {
    try {
      sessionStorage.setItem(storageKey(), JSON.stringify(ids.value))
    } catch {
      /* 偏好存储失败不阻断当前查询。 */
    }
  }
  watch(
    key,
    () => {
      ids.value = []
      restored = false
      open.value = false
    },
    { flush: 'sync' }
  )
  watch(
    context.projects,
    (projects) => {
      if (!projects.length) {
        ids.value = []
        return
      }
      if (!restored) {
        restored = true
        try {
          const stored: unknown = JSON.parse(sessionStorage.getItem(storageKey()) || '[]')
          if (Array.isArray(stored))
            ids.value = [...new Set(stored.filter((id): id is string => typeof id === 'string'))].slice(0, 100)
        } catch {
          ids.value = []
        }
      }
      const authorized = ids.value.filter((id) => projects.some((p) => p.id === id))
      if (authorized.length !== ids.value.length) ids.value = authorized
      remember()
    },
    { immediate: true }
  )
  async function refresh() {
    try {
      await context.refresh()
    } catch {
      onlyMessage(t('ProjectContext.failed'), 'error')
    }
  }
  function confirm(next: string[]) {
    if (!next.length || next.length > 100 || next.some((id) => !context.projects.value.some((p) => p.id === id))) return
    const selected = [...new Set(next)]
    if (selected.length !== ids.value.length || selected.some((id, i) => id !== ids.value[i])) ids.value = selected
    remember()
    open.value = false
  }
  async function choose() {
    open.value = true
    await refresh()
  }
  onMounted(() => {
    if (!context.projects.value.length && !context.loading.value) void refresh()
  })
  return { context, ids, label, open, refresh, confirm, choose }
}
