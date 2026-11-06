<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useMenuStore } from '@jetlinks-web-core/store'
import type { ClosingAction, AccountingPeriod } from '../../../api/financeAccounting'
import { useClosingBatch } from '../../../hooks/finance-month-closing/useClosingBatch'
const { jumpPage } = useMenuStore()
const props = defineProps<{ projectId: string; periods: AccountingPeriod[]; action: ClosingAction }>(),
  emit = defineEmits<{ close: []; saved: [] }>(),
  { t, te } = useI18n()
const { reason, busy, rows, uncertain, completed, invalidate, run } = useClosingBatch(props, () => emit('saved'))
const columns = [
  { title: t('MonthClosing.accountMonth'), dataIndex: 'month' },
  { title: t('FinanceHandover.batchResult'), dataIndex: 'status' },
  { title: t('MonthClosing.unhanded'), dataIndex: 'unhandedCount' },
  { title: t('MonthClosing.pendingHandover'), dataIndex: 'pendingHandoverCount' },
  { title: t('MonthClosing.pendingReceivable'), dataIndex: 'pendingReceivableCount' },
  { title: t('FinanceHandover.reason'), dataIndex: 'errorCode' }
]
function failureReason(code?: string) {
  if (!code) return '—'
  if (!code.startsWith('error.')) return code
  const key = 'MonthClosing.auto.errors.' + code.replace('error.property_finance_', '')
  return te(key) ? t(key) : t('FinanceHandover.preflightRejected')
}
</script>
<template>
  <a-modal
    :open="true"
    :title="t('MonthClosing.batch.' + action)"
    :width="1000"
    :closable="!busy && !uncertain"
    :keyboard="!busy && !uncertain"
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
        {{ t('FinanceHandover.details') }}
      </a-button>
      <a-button
        type="link"
        @click="jumpPage('charging/FinanceHandoverRecord')"
      >
        {{ t('FinanceHandover.records') }}
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
        :label="t('FinanceHandover.reason')"
        required
      >
        <a-textarea
          v-model:value="reason"
          :disabled="busy || uncertain || completed"
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
          {{ failureReason(record.errorCode) }}
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
      <j-permission-button
        v-if="!completed"
        :hasPermission="'charging/FinanceMonthClosing:' + action.toLowerCase()"
        type="primary"
        :loading="busy"
        :disabled="!reason.trim() || (!uncertain && rows.some((row) => row.status === 'FAILED'))"
        @click="run(!!rows.length)"
      >
        {{ t(uncertain ? 'Cashier.retry' : rows.length ? 'MonthClosing.confirm.' + action : 'MonthClosing.check') }}
      </j-permission-button>
    </template>
  </a-modal>
</template>
