import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { onlyMessage } from '@jetlinks-web/utils'
import { useProjectContext } from './useProjectContext'

/** 仅收费页面消费；普通业务单项目与报表多项目共享同一个选择入口。 */
export function useProjectScope(multiple: () => boolean) {
  const context = useProjectContext()
  const { t } = useI18n()
  const open = ref(false)
  const required = computed(() => (multiple() ? !context.reportProjectIds.value.length : !context.projectId.value))
  const label = computed(() =>
    multiple()
      ? context.projects.value
          .filter((p) => context.reportProjectIds.value.includes(p.id))
          .map((p) => p.name)
          .join('、')
      : context.current.value?.name
  )
  watch(
    required,
    (value) => {
      if (value) open.value = true
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
  async function choose() {
    open.value = true
    await refresh()
  }
  async function confirm(ids: string[]) {
    const accepted = multiple() ? await context.selectMany(ids) : await context.select(ids[0])
    if (accepted) open.value = false
    else onlyMessage(t('ProjectContext.switchBlocked'), 'warning')
  }
  onMounted(() => {
    if (!context.projects.value.length && !context.loading.value) void refresh()
  })
  return { context, open, required, label, choose, confirm, refresh }
}
