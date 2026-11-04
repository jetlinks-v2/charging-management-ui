<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { PaymentRecord } from '../../../api/financeCashier'
import type { RefundPreview } from '../../../api/financeRefund'
import { refundableMoney } from '../../../utils/refundMoney'
const props = defineProps<{
  rows?: PaymentRecord[]
  preview?: Pick<RefundPreview, 'allocations'>
  amountLabel?: string
}>()
const { t } = useI18n()
const data = computed(
  () =>
    props.preview?.allocations.map((row) => ({ ...row, id: row.sourceLineId })) ||
    props.rows?.map((row) => ({
      ...row.line,
      originalAmount: row.line.amount,
      available: refundableMoney(row.line)
    })) ||
    []
)
const columns = computed<import('ant-design-vue').TableColumnsType>(() => [
  { title: t('Setting.house'), dataIndex: 'fullName', width: 240 },
  { title: t('Receivable.customerName'), dataIndex: 'customerName', width: 130 },
  { title: t('Receivable.subjectName'), dataIndex: 'subjectName', width: 150 },
  { title: t('Cashier.amount'), dataIndex: 'originalAmount', width: 130, align: 'right' },
  { title: t('Cashier.refunded'), dataIndex: 'refundedAmount', width: 130, align: 'right' },
  {
    title: t(props.preview ? props.amountLabel || 'Refund.amount' : 'Refund.available'),
    dataIndex: props.preview ? 'amount' : 'available',
    width: 130,
    align: 'right'
  }
])
</script>
<template>
  <a-table
    :columns="columns"
    :data-source="data"
    row-key="id"
    size="small"
    :pagination="false"
    :scroll="{ x: 910 }"
  />
</template>
