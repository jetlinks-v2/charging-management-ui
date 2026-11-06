<script setup lang="ts">
import { formatFinanceTime } from '../../../utils/financeTime'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { useCashierWorkspace } from '../../../hooks/finance-cashier/useCashierWorkspace'
import { useCashierRecords } from '../../../hooks/finance-cashier/useCashierRecords'
import type { PaymentRecord } from '../../../api/financeCashier'
import PaymentSummary from './PaymentSummary.vue'
const props = defineProps<{ state: ReturnType<typeof useCashierWorkspace> }>()
const { t } = useI18n()
const { table, params, request, record, open, loading, select, close } = useCashierRecords(props.state)
const rowKey = (row: PaymentRecord) => row.line.id
const columns = computed(() => [
  { title: t('Cashier.paymentId'), dataIndex: 'paymentId', scopedSlots: true, width: 200 },
  { title: t('Setting.house'), dataIndex: 'house', scopedSlots: true, width: 220 },
  { title: t('Receivable.customerName'), dataIndex: 'customer', scopedSlots: true, width: 120 },
  { title: t('Receivable.subjectName'), dataIndex: 'subject', scopedSlots: true, width: 140 },
  { title: t('Cashier.amount'), dataIndex: 'amount', scopedSlots: true, width: 110, align: 'right' },
  { title: t('Cashier.method'), dataIndex: 'method', scopedSlots: true, width: 130 },
  { title: t('Cashier.paidAt'), dataIndex: 'paidAt', scopedSlots: true, width: 180 },
  { title: t('Cashier.operator'), dataIndex: 'operatorName', width: 110 }
])
</script>
<template>
  <j-pro-table
    v-if="state.archive.projectId.value"
    ref="table"
    :row-key="rowKey"
    type="PAGE"
    mode="TABLE"
    :columns="columns"
    :params="params"
    :request="request"
    :no-pagination="false"
    :pagination="{ pageSize: 12 }"
    :body-style="{ padding: 0 }"
    :scroll="{ x: 1210 }"
    @request-error="state.notify"
  >
    <template #paidAt="row">{{ formatFinanceTime(row.paidAt) }}</template>
    <template #paymentId="row">
      <a-button
        type="link"
        @click="select(row.line.paymentId)"
      >
        {{ row.line.paymentId }}
      </a-button>
    </template>
    <template #house="row">{{ row.line.fullName }}</template>
    <template #customer="row">{{ row.line.customerName }}</template>
    <template #subject="row">{{ row.line.subjectName }}</template>
    <template #amount="row">
      <strong class="cashier-number">{{ row.line.amount }}</strong>
    </template>
    <template #method="row">
      {{ row.line.methodText }}
      <small class="cashier-record-bank">{{ row.line.bankName }}</small>
    </template>
    <template #emptyText><CloudEmpty :description="t('Cashier.noPayments')" /></template>
  </j-pro-table>
  <JlDrawerShell
    v-if="open"
    :open="true"
    :width="960"
    :title="t('Cashier.paymentInfo')"
    @update:open="close"
  >
    <a-spin :spinning="loading">
      <PaymentSummary
        v-if="record"
        :detail="record"
      />
      <CloudEmpty
        v-else-if="!loading"
        :description="t('Finance.failed')"
      />
    </a-spin>
    <template #foot>
      <a-button @click="close">{{ t('Finance.close') }}</a-button>
    </template>
  </JlDrawerShell>
</template>
