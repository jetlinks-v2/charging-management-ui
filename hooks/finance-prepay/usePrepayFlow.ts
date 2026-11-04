import { ref, watch, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { onlyMessage } from '@jetlinks-web/utils'
import { useProjectSwitchGuard } from '../project/useProjectContext'
import { usePrepayRecovery } from './usePrepayRecovery'
export function usePrepayFlow(project: Ref<string>) {
  const { t } = useI18n(),
    recovery = usePrepayRecovery(project)
  const open = ref(false),
    pending = ref(false),
    failed = ref(false)
  const spaceId = ref(''),
    spaceName = ref('')
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
  function start(id: string, name: string) {
    if (project.value && id && !pending.value && !failed.value) {
      spaceId.value = id
      spaceName.value = name
      open.value = true
    }
  }
  function recover() {
    try {
      const saved = recovery.read()
      if (saved) {
        spaceId.value = saved.spaceId
        spaceName.value = saved.quote.houseName
        open.value = true
      }
    } catch {
      failed.value = true
      onlyMessage(t('Cashier.recoveryUnavailable'), 'error')
    }
  }
  function close() {
    open.value = false
    read()
  }
  function saved() {
    read()
  }
  return { open, pending, failed, spaceId, spaceName, start, recover, close, saved }
}
