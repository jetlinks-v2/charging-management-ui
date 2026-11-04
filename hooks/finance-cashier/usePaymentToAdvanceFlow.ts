import { ref, watch, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { onlyMessage } from '@jetlinks-web/utils'
import type { PaymentRecord } from '../../api/financeCashier'
import { useProjectSwitchGuard } from '../project/useProjectContext'
import { usePaymentToAdvanceRecovery } from './usePaymentToAdvance'

export function usePaymentToAdvanceFlow(project: Ref<string>, refresh: () => void) {
  const { t } = useI18n(),
    recovery = usePaymentToAdvanceRecovery(project)
  const rows = ref<PaymentRecord[]>(),
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
      rows.value = undefined
      read()
    },
    { immediate: true }
  )
  useProjectSwitchGuard(() => !rows.value && !pending.value && !failed.value)
  function start(value: PaymentRecord[]) {
    if (!pending.value && !failed.value && value.length && value.length <= 100)
      rows.value = value.map((row) => ({ ...row, line: { ...row.line } }))
  }
  function recover() {
    if (pending.value) rows.value = []
  }
  function close() {
    rows.value = undefined
    read()
  }
  function saved() {
    pending.value = false
    refresh()
  }
  return { rows, pending, failed, start, recover, close, saved }
}
