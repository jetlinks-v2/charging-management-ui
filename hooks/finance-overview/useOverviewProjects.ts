import { computed, onMounted, ref, watch } from 'vue'
import { useUserStore } from '@jetlinks-web-core/store/user'
import { getApplicationAccessContext } from '@jetlinks-web-core/utils/request-context'
import { getApplicationRuntimeEntry } from '@jetlinks-web-core/utils/project-runtime'
import { onlyMessage } from '@jetlinks-web/utils'
import { useI18n } from 'vue-i18n'
import { useProjectContext } from '../project/useProjectContext'

/** 概览选择与业务单项目、报表范围独立，每次进入都需确认当前授权项目。 */
export function useOverviewProjects() {
  const context = useProjectContext(),
    user = useUserStore(),
    { t } = useI18n()
  const ids = ref<string[]>([]),
    open = ref(false)
  const required = computed(() => !ids.value.length)
  const key = computed(() =>
    JSON.stringify([
      user.userInfo.id || '',
      getApplicationAccessContext().domain || '',
      getApplicationRuntimeEntry().applicationId || '',
      window.location.pathname.split('/')[1] || ''
    ])
  )
  const label = computed(() =>
    context.projects.value
      .filter((p) => ids.value.includes(p.id))
      .map((p) => p.name)
      .join('、')
  )
  watch(
    key,
    () => {
      ids.value = []
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
      const authorized = ids.value.filter((id) => projects.some((p) => p.id === id))
      if (authorized.length !== ids.value.length) ids.value = authorized
    },
    { immediate: true }
  )
  watch(
    ids,
    () => {
      if (required.value) open.value = true
    },
    { immediate: true, flush: 'sync' }
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
    open.value = false
  }
  async function choose() {
    open.value = true
    await refresh()
  }
  function close() {
    if (!required.value) open.value = false
  }
  onMounted(() => {
    if (!context.projects.value.length && !context.loading.value) void refresh()
  })
  return { context, ids, label, open, required, refresh, confirm, choose, close }
}
