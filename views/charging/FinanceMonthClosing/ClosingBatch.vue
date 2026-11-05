<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useMenuStore } from '@jetlinks-web-core/store'
import { onlyMessage } from '@jetlinks-web/utils'
import {
  batchClosing,
  type ClosingAction,
  type AccountingPeriod,
  type ClosingBatchInput,
  type ClosingBatchResult
} from '../../../api/financeAccounting'
import { useFinanceBatchRecovery } from '../../../hooks/finance-handover/useFinanceBatchRecovery'
import { useProjectSwitchGuard } from '../../../hooks/project/useProjectContext'
import { requestErrorMessage } from '../../../utils/requestError'
const { jumpPage } = useMenuStore()
const props = defineProps<{ projectId: string; periods: AccountingPeriod[]; action: ClosingAction }>(),
  emit = defineEmits<{ close: []; saved: [] }>(),
  { t } = useI18n()
const reason = ref(''),
  busy = ref(false),
  rows = ref<ClosingBatchResult[]>([]),
  uncertain = ref(false)
const recovery = useFinanceBatchRecovery<ClosingBatchInput>(() => props.projectId, 'closing')
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
  rows.value = []
  input = undefined
}
async function run(confirm = false) {
  if (busy.value || !reason.value.trim()) return
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
      emit('saved')
    }
  } catch (error) {
    if (confirm) uncertain.value = true
    onlyMessage(requestErrorMessage(error, t('Finance.failed')), 'error')
  } finally {
    busy.value = false
  }
}
const columns = [
  { title: t('MonthClosing.accountMonth'), dataIndex: 'month' },
  { title: t('Handover.batchResult'), dataIndex: 'status' },
  { title: t('MonthClosing.unhandedCount'), dataIndex: 'unhandedCount' },
  { title: t('MonthClosing.pendingHandoverCount'), dataIndex: 'pendingHandoverCount' },
  { title: t('MonthClosing.pendingReceivableCount'), dataIndex: 'pendingReceivableCount' },
  { title: t('Handover.reason'), dataIndex: 'errorCode' }
]
</script>
<template>
  <a-modal
    :open="true"
    :title="t('MonthClosing.batch.' + action)"
    :width="1000"
    :closable="!busy && !uncertain"
    :mask-closable="false"
    @cancel="emit('close')"
  >
    <a-alert
      type="info"
      show-icon
      :message="t('MonthClosing.batchHint')"
    />
    <a-space
      style="margin: 12px 0"
      wrap
    >
      <a-button
        type="link"
        @click="jumpPage('charging/FinanceHandover')"
      >
        {{ t('Handover.details') }}
      </a-button>
      <a-button
        type="link"
        @click="jumpPage('charging/FinanceHandoverRecord')"
      >
        {{ t('Handover.records') }}
      </a-button>
      <a-button
        type="link"
        @click="jumpPage('charging/FinanceReceivable')"
      >
        {{ t('MonthClosing.pendingReceivable') }}
      </a-button>
    </a-space>
    <a-form layout="vertical">
      <a-form-item
        :label="t('Handover.reason')"
        required
      >
        <a-textarea
          v-model:value="reason"
          :disabled="busy || uncertain"
          :maxlength="1000"
          @change="invalidate"
        />
      </a-form-item>
    </a-form>
    <a-table
      :data-source="rows"
      :columns="columns"
      row-key="month"
      :pagination="false"
      :scroll="{ x: 900, y: 320 }"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.dataIndex === 'errorCode'">
          {{
            record.errorCode
              ? record.errorCode.startsWith('error.')
                ? t('Handover.preflightRejected')
                : record.errorCode
              : '—'
          }}
        </template>
        <template v-else-if="column.dataIndex === 'status'">
          {{ t('MonthClosing.batchStatus.' + record.status) }}
        </template>
        <template v-else-if="String(column.dataIndex).endsWith('Count')">
          {{ record.preview?.[String(column.dataIndex) as keyof typeof record.preview] ?? '—' }}
        </template>
      </template>
    </a-table>
    <template #footer>
      <a-button
        :disabled="busy || uncertain"
        @click="emit('close')"
      >
        {{ t('Finance.close') }}
      </a-button>
      <a-button
        type="primary"
        :loading="busy"
        :disabled="!reason.trim() || (!uncertain && rows.some((row) => row.status === 'FAILED'))"
        @click="run(!!rows.length)"
      >
        {{ t(uncertain ? 'Cashier.retry' : rows.length ? 'Handover.confirm' : 'Handover.preview') }}
      </a-button>
    </template>
  </a-modal>
</template>
