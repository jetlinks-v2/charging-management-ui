import { ref, watch, type Ref } from 'vue'
import { onlyMessage } from '@jetlinks-web/utils'
import { useI18n } from 'vue-i18n'
import { useProjectSwitchGuard } from '../project/useProjectContext'
import { useFundRecovery } from './useFundRecovery'
import type { FundDraft } from '../../api/financeFunds'
export function useFundFlow(project: Ref<string>) {
  const { t } = useI18n()
  const draft = ref<FundDraft>(),
    pending = ref(false),
    failed = ref(false),
    recovery = useFundRecovery(project)
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
  function start(value: FundDraft) {
    if (project.value && !pending.value && !failed.value) draft.value = value
  }
  function recover() {
    if (pending.value) draft.value = { type: 'ADVANCE', action: 'TOPUP' }
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
