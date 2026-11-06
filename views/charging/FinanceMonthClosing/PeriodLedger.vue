<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import ConditionFilter, { type ConditionFilterChangePayload } from '@jetlinks-web-core/components/ConditionFilter'
import type { AccountingPeriod } from '../../../api/financeAccounting'
const props = defineProps<{ periods: AccountingPeriod[]; selectedKeys: string[]; disabled: boolean }>()
const emit = defineEmits<{ select: [month: string]; selection: [rows: AccountingPeriod[]] }>(),
  { t } = useI18n()
const status = ref('ALL'),
  month = ref(''),
  closedOn = ref('')
const fields = computed(() =>
  ['accountMonth', 'closedOn'].map((key) => ({
    title: t('MonthClosing.' + key),
    dataIndex: key,
    search: { type: 'string' as const }
  }))
)
function filter({ filter: value }: ConditionFilterChangePayload) {
  month.value = ''
  closedOn.value = ''
  for (const term of value.terms || [])
    if ('column' in term) {
      if (term.column === 'accountMonth') month.value = String(term.value || '')
      if (term.column === 'closedOn') closedOn.value = String(term.value || '')
    }
}
const rows = computed(() =>
  props.periods.filter(
    (row) =>
      (status.value === 'ALL' || row.status === status.value) &&
      row.accountMonth.includes(month.value) &&
      (!closedOn.value || row.closedOn?.includes(closedOn.value))
  )
)
const request = async () => ({
  success: true,
  result: { data: rows.value, total: rows.value.length, pageIndex: 0, pageSize: rows.value.length }
})
const columns = computed(() => [
  { title: t('MonthClosing.accountMonth'), dataIndex: 'accountMonth', width: 110 },
  { title: t('MonthClosing.startDate'), dataIndex: 'startDate', width: 120 },
  { title: t('MonthClosing.endDate'), dataIndex: 'endDate', width: 120 },
  { title: t('FinanceHandover.state'), dataIndex: 'status', width: 120, scopedSlots: true },
  { title: t('MonthClosing.closedOn'), dataIndex: 'closedOn', width: 180 },
  { title: t('FinanceHandover.operator'), dataIndex: 'closedName', width: 140 },
  { title: t('Finance.actions'), dataIndex: 'actions', width: 130, scopedSlots: true }
])
const selection = computed(() => ({
  selectedRowKeys: props.selectedKeys,
  onChange: (_keys: unknown, records: AccountingPeriod[]) => emit('selection', records),
  getCheckboxProps: () => ({ disabled: props.disabled })
}))
// 年度、筛选或服务端版本变化后清空选择，不能把旧账期带入批量提交。
watch(rows, () => emit('selection', []))
</script>
<template>
  <div class="period-ledger">
    <a-select
      v-model:value="status"
      :disabled="disabled"
      :options="['ALL', 'OPEN', 'CLOSED'].map((value) => ({ value, label: t('MonthClosing.status.' + value) }))"
      style="width: 160px; margin-bottom: 12px"
    />
    <ConditionFilter
      class="period-filter"
      :fields="fields"
      @change="filter"
    />
    <j-pro-table
      row-key="id"
      type="PAGE"
      mode="TABLE"
      :columns="columns"
      :request="request"
      :params="{ rows }"
      :row-selection="selection"
      :no-pagination="false"
      :pagination="{ pageSize: 12 }"
      :alert-show="false"
      :body-style="{ padding: 0 }"
      :scroll="{ x: 950 }"
    >
      <template #status="row">
        <a-tag :color="row.status === 'CLOSED' ? 'success' : 'default'">
          {{ t('MonthClosing.status.' + row.status) }}
        </a-tag>
      </template>
      <template #actions="row">
        <a-button
          type="link"
          :disabled="disabled"
          @click="emit('select', row.accountMonth)"
        >
          {{ t('Finance.detail') }}
        </a-button>
      </template>
      <template #emptyText><CloudEmpty /></template>
    </j-pro-table>
  </div>
</template>
<style scoped>
.period-ledger {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  min-width: 0;
}
.period-filter {
  flex: none;
  margin-bottom: 16px;
}
</style>
