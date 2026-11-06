<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { onlyMessage } from '@jetlinks-web/utils'
import {
  batchHandover,
  type HandoverRecord,
  type HandoverBatchInput,
  type HandoverBatchResult
} from '../../../api/financeHandover'
import { useFinanceBatchRecovery } from '../../../hooks/finance-handover/useFinanceBatchRecovery'
import { useProjectSwitchGuard } from '../../../hooks/project/useProjectContext'
import { requestErrorMessage } from '../../../utils/requestError'
const props = defineProps<{ projectId: string; records: HandoverRecord[]; action: 'APPROVE' | 'UNAPPROVE' }>()
const emit = defineEmits<{ close: []; saved: [] }>()
const { t } = useI18n(),
  reason = ref(''),
  busy = ref(false),
  rows = ref<HandoverBatchResult[]>([]),
  completed = ref(false)
let input: HandoverBatchInput | undefined
const recovery = useFinanceBatchRecovery<HandoverBatchInput>(() => props.projectId, 'handover'),
  uncertain = ref(false)
useProjectSwitchGuard(() => !busy.value && !uncertain.value)
onMounted(() => {
  try {
    const pending = recovery.read()
    if (pending) {
      if (pending.action !== props.action) throw Error(t('FinanceHandover.pendingRecovery'))
      input = pending.input
      reason.value = input.reason
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
        items: props.records.map((row) => ({ id: row.id, version: row.version, requestId: crypto.randomUUID() }))
      }
    if (confirm || uncertain.value) recovery.write(props.action, input!)
    rows.value = await batchHandover(props.projectId, props.action, input!, !(confirm || uncertain.value))
    if (confirm || uncertain.value) {
      completed.value = true
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
  { title: t('FinanceHandover.handoverNo'), dataIndex: 'id' },
  { title: t('FinanceHandover.batchResult'), dataIndex: 'success' },
  { title: t('FinanceHandover.reason'), dataIndex: 'errorCode' }
]
</script>
<template>
  <a-modal
    :open="true"
    :title="t('FinanceHandover.action.' + action)"
    :width="760"
    :closable="!busy && !uncertain"
    :mask-closable="false"
    @cancel="emit('close')"
  >
    <a-alert
      type="info"
      show-icon
      :message="t('FinanceHandover.batchHint', { count: records.length })"
    />
    <a-form layout="vertical">
      <a-form-item
        :label="t('FinanceHandover.reason')"
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
      v-if="rows.length"
      :data-source="rows"
      :columns="columns"
      row-key="id"
      :pagination="false"
      :scroll="{ y: 300 }"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.dataIndex === 'errorCode'">
          {{
            record.errorCode
              ? record.errorCode.startsWith('error.')
                ? t('FinanceHandover.preflightRejected')
                : record.errorCode
              : '—'
          }}
        </template>
        <template v-else-if="column.dataIndex === 'success'">
          <a-tag :color="record.success ? 'success' : 'error'">
            {{ t(record.success ? (completed ? 'FinanceHandover.batchCompleted' : 'FinanceHandover.ready') : 'Finance.failed') }}
          </a-tag>
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
      <j-permission-button
        v-if="!completed"
        :hasPermission="'charging/FinanceHandoverRecord:' + action.toLowerCase()"
        type="primary"
        :loading="busy"
        :disabled="!reason.trim()"
        @click="run(!!rows.length)"
      >
        {{ t(uncertain ? 'Cashier.retry' : rows.length ? 'FinanceHandover.confirm' : 'FinanceHandover.preview') }}
      </j-permission-button>
    </template>
  </a-modal>
</template>
