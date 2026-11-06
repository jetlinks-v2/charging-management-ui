import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { onlyMessage } from '@jetlinks-web/utils'
import {
  batchClosing,
  type ClosingAction,
  type AccountingPeriod,
  type ClosingBatchInput,
  type ClosingBatchResult
} from '../../api/financeAccounting'
import { useFinanceBatchRecovery } from '../finance-handover/useFinanceBatchRecovery'
import { useProjectSwitchGuard } from '../project/useProjectContext'
import { requestErrorMessage } from '../../utils/requestError'

/** 批量确认保留请求快照；完成后只展示结果，不允许以旧版本再次提交。 */
export function useClosingBatch(
  props: { projectId: string; periods: AccountingPeriod[]; action: ClosingAction },
  saved: () => void
) {
  const { t } = useI18n()
  const reason = ref(''),
    busy = ref(false),
    rows = ref<ClosingBatchResult[]>([]),
    uncertain = ref(false)
  const recovery = useFinanceBatchRecovery<ClosingBatchInput>(() => props.projectId, 'closing')
  const completed = ref(false)
  useProjectSwitchGuard(() => !busy.value && !uncertain.value)
  let input: ClosingBatchInput | undefined
  onMounted(() => {
    try {
      const pending = recovery.read()
      if (pending) {
        if (pending.action !== props.action) throw Error(t('MonthClosing.pending'))
        input = pending.input
        reason.value = input!.reason
        uncertain.value = true
      }
    } catch (error) {
      onlyMessage(requestErrorMessage(error, t('Finance.failed')), 'error')
    }
  })
  function invalidate() {
    if (busy.value || uncertain.value || completed.value) return
    rows.value = []
    input = undefined
  }
  async function run(confirm = false) {
    if (busy.value || completed.value || !reason.value.trim()) return
    busy.value = true
    try {
      if (!confirm && !uncertain.value)
        input = {
          reason: reason.value.trim(),
          items: props.periods.map((row) => ({
            month: row.accountMonth,
            version: row.version,
            requestId: crypto.randomUUID()
          }))
        }
      if (confirm || uncertain.value) recovery.write(props.action, input!)
      rows.value = await batchClosing(props.projectId, props.action, input!, !(confirm || uncertain.value))
      if (confirm || uncertain.value) {
        recovery.clear()
        uncertain.value = false
        completed.value = true
        saved()
      }
    } catch (error) {
      if (confirm) uncertain.value = true
      onlyMessage(requestErrorMessage(error, t('Finance.failed')), 'error')
    } finally {
      busy.value = false
    }
  }
  return { reason, busy, rows, uncertain, completed, invalidate, run }
}
