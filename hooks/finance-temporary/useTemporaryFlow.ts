import { ref, watch, type Ref } from 'vue'
import { onlyMessage } from '@jetlinks-web/utils'
import { useI18n } from 'vue-i18n'
import { useProjectSwitchGuard } from '../project/useProjectContext'
import { useTemporaryRecovery } from './useTemporaryRecovery'
export function useTemporaryFlow(project: Ref<string>) {
  const { t } = useI18n(),
    open = ref(false),
    pending = ref(false),
    failed = ref(false),
    initialSpace = ref<string>()
  const recovery = useTemporaryRecovery(project)
  function read() {
    failed.value = false
    try {
      pending.value = !!project.value && !!recovery.read()
    } catch {
      failed.value = true
      onlyMessage(t('Cashier.recoveryUnavailable'), 'error')
    }
  }
  watch(
    project,
    () => {
      open.value = false
      read()
    },
    { immediate: true }
  )
  useProjectSwitchGuard(() => !open.value && !pending.value && !failed.value)
  function start(space?: string) {
    if (project.value && !pending.value && !failed.value) {
      initialSpace.value = space
      open.value = true
    }
  }
  function recover() {
    if (pending.value) open.value = true
  }
  function close() {
    open.value = false
    read()
  }
  function saved() {
    pending.value = false
  }
  return { open, pending, failed, initialSpace, start, recover, close, saved }
}
