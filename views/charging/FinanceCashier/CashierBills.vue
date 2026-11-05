<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Receivable } from '../../../api/financeReceivable'
const props = defineProps<{
  rows: Receivable[]
  amounts?: { id: string; amount: string }[]
  editable?: boolean
  hideHouse?: boolean
}>()
const emit = defineEmits<{ amount: [index: number, value: string] }>()
const { t } = useI18n()
const columns = computed(() => [
  ...(props.hideHouse ? [] : [{ title: t('Setting.house'), dataIndex: 'fullName', width: 240 }]),
  { title: t('Receivable.subjectName'), dataIndex: 'subjectName', width: 170 },
  { title: t('Receivable.customerName'), dataIndex: 'customerName', width: 120 },
  { title: t('Receivable.arrears'), dataIndex: 'arrears', width: 130, align: 'right' as const },
  { title: t('Cashier.amount'), key: 'amount', width: 180, align: 'right' as const }
])
</script>
<template>
  <a-table
    :columns="columns"
    :data-source="rows"
    row-key="id"
    :pagination="false"
    size="small"
    :scroll="{ x: hideHouse ? 600 : 840, y: 240 }"
  >
    <template #bodyCell="{ column, record, index }">
      <template v-if="column.dataIndex === 'customerName'">
        {{ record.customerNames?.length ? record.customerNames.join('、') : record.customerName }}
      </template>
      <template v-else-if="column.key === 'amount'">
        <a-input-number
          v-if="editable"
          :value="amounts?.[index]?.amount"
          string-mode
          :precision="2"
          :min="'0.00'"
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
