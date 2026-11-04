<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { Receivable } from '../../../api/financeReceivable'
defineProps<{ rows: Receivable[]; amounts?: { id: string; amount: string }[]; editable?: boolean }>()
const emit = defineEmits<{ amount: [index: number, value: string] }>()
const { t } = useI18n()
const columns = [
  { title: t('Setting.house'), dataIndex: 'fullName', width: 240 },
  { title: t('Receivable.subjectName'), dataIndex: 'subjectName', width: 170 },
  { title: t('Receivable.customerName'), dataIndex: 'customerName', width: 120 },
  { title: t('Receivable.arrears'), dataIndex: 'arrears', width: 130 },
  { title: t('Cashier.amount'), key: 'amount', width: 180 }
]
</script>
<template>
  <a-table
    :columns="columns"
    :data-source="rows"
    row-key="id"
    :pagination="false"
    size="small"
    :scroll="{ x: 740, y: 280 }"
  >
    <template #bodyCell="{ column, record, index }">
      <template v-if="column.key === 'amount'">
        <a-input-number
          v-if="editable"
          :value="amounts?.[index]?.amount"
          string-mode
          :precision="2"
          :min="'0.01'"
          :max="'999999999999999999.99'"
          :aria-label="`${record.subjectName} ${t('Cashier.amount')}`"
          @update:value="(value) => emit('amount', index, String(value ?? ''))"
        />
        <strong
          v-else
          class="cashier-money"
        >
          {{ amounts?.find((item) => item.id === record.id)?.amount }}
        </strong>
      </template>
    </template>
  </a-table>
</template>
