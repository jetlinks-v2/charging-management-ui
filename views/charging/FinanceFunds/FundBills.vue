<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { FundAccount } from '../../../api/financeFunds'
import { useFundBills } from '../../../hooks/finance-funds/useFundBills'
const props = defineProps<{ projectId: string; account: FundAccount }>()
const emit = defineEmits<{ change: [{ id: string; version: number; amount: string }[], string] }>()
const { t } = useI18n()
const { rows, total, page, loading, selection, amounts, changed, load } = useFundBills(props, (...args) =>
  emit('change', ...args)
)
const columns = computed<import('ant-design-vue').TableColumnsType>(() => [
  { title: t('Receivable.customerName'), dataIndex: 'customerName', width: 130 },
  { title: t('Receivable.calcStartDate'), dataIndex: 'calcStartDate', width: 130 },
  { title: t('Receivable.calcEndDate'), dataIndex: 'calcEndDate', width: 130 },
  { title: t('Receivable.arrears'), dataIndex: 'arrears', width: 130 },
  { title: t('Funds.offsetAmount'), key: 'amount', width: 160 }
])
</script>
<template>
  <SectionCard
    icon="AccountBookOutlined"
    :title="t('Funds.bills')"
  >
    <a-table
      :columns="columns"
      :data-source="rows"
      :row-selection="selection"
      row-key="id"
      size="small"
      :loading="loading"
      :scroll="{ x: 680 }"
      :pagination="{ current: page, total, pageSize: 8, onChange: load }"
    >
      <template #bodyCell="{ column, record }">
        <a-input-number
          v-if="column.key === 'amount'"
          v-model:value="amounts[record.id]"
          string-mode
          :precision="2"
          :min="'0.01'"
          @change="changed"
        />
      </template>
    </a-table>
  </SectionCard>
</template>
