import { computed, ref, watch, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { onlyMessage } from '@jetlinks-web/utils'
import type { PaymentRecord } from '../../api/financeCashier'
import { useRefundRecovery } from './useRefundRecovery'
import { useProjectSwitchGuard } from '../project/useProjectContext'
import { refundableMoney } from '../../utils/refundMoney'

export function useRefundFlow(project: Ref<string>, refresh: () => void) {
  const { t } = useI18n()
  const selected = ref<PaymentRecord[]>([]),
    rows = ref<PaymentRecord[]>(),
    pending = ref(false),
    failed = ref(false)
  const recovery = useRefundRecovery(project)
  function readPending() {
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
      rows.value = undefined
      selected.value = []
      readPending()
    },
    { immediate: true }
  )
  useProjectSwitchGuard(() => !rows.value)
  function start(value: PaymentRecord[]) {
    if (!pending.value && !failed.value && value.length && value.length <= 100)
      rows.value = value.map((row) => ({ ...row, line: { ...row.line } }))
  }
  const selection = computed(() => ({
    selectedRowKeys: selected.value.map((row) => row.line.id),
    onChange: (_keys: string[], value: PaymentRecord[]) => {
      selected.value = value
    },
    preserveSelectedRowKeys: false,
    getCheckboxProps: (row: PaymentRecord) => ({ disabled: refundableMoney(row.line) === '0.00' })
  }))
  function close() {
    rows.value = undefined
    readPending()
  }
  function saved() {
    selected.value = []
    pending.value = false
    refresh()
  }
  return { selected, rows, pending, failed, selection, start, close, saved }
}
