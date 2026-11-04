import { ref, watch, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { onlyMessage } from '@jetlinks-web/utils'
import { useProjectSwitchGuard } from '../project/useProjectContext'
import type { FundReturnDraft } from '../../api/financeFundReturn'
import { useFundReturnRecovery } from './useFundReturn'

export function useFundReturnFlow(project: Ref<string>) {
  const { t } = useI18n(),
    recovery = useFundReturnRecovery(project)
  const draft = ref<FundReturnDraft>(),
    pending = ref(false),
    failed = ref(false)
  function read() {
    failed.value = false
    try {
      pending.value = !!project.value && !!recovery.read()
    } catch {
      failed.value = true
      onlyMessage(t('Funds.recoveryUnavailable'), 'error')
    }
  }
  watch(
    project,
    () => {
      draft.value = undefined
      read()
    },
    { immediate: true }
  )
  useProjectSwitchGuard(() => !draft.value && !pending.value && !failed.value)
  function start(value: FundReturnDraft) {
    if (project.value && !pending.value && !failed.value) draft.value = value
  }
  function recover() {
    if (pending.value) draft.value = {}
  }
  function close() {
    draft.value = undefined
    read()
  }
  function saved() {
    pending.value = false
  }
  return { draft, pending, failed, start, recover, close, saved }
}
