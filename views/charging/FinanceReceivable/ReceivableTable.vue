<script setup lang="ts">
import { computed } from 'vue'
import { TableSummary, TableSummaryRow, TableSummaryCell } from 'ant-design-vue'
import { useI18n } from 'vue-i18n'
import ReceivableFilters from './ReceivableFilters.vue'
import ReceivableCell from './ReceivableCell.vue'
import type { Receivable } from '../../../api/financeReceivable'
import { type useReceivableWorkspace } from '../../../hooks/finance-receivable/useReceivableWorkspace'
import ReceivableBatchActions from './ReceivableBatchActions.vue'
import ReceivableColumnSettings from './ReceivableColumnSettings.vue'
import ReceivableRowActions from './ReceivableRowActions.vue'
import { useReceivableColumns } from '../../../hooks/finance-receivable/useReceivableColumns'
const props = defineProps<{ state: ReturnType<typeof useReceivableWorkspace>; cashier?: boolean }>()
const { t } = useI18n()
const { archive, table, params, request, select, actionTarget, notify } = props.state
const columnState = useReceivableColumns()
const { columns, scrollWidth } = columnState
const formulaKeys = [
  'contractReceivableAmount',
  'accruedReceivableAmount',
  'actualReceivableAmount',
  'incomeExcludingTax',
  'outputTaxAmount',
  'arrears',
  'finalLateFeeAmount'
]
const selection = computed(() => ({
  selectedRowKeys: props.state.batch.selected.value.map((row) => row.id),
  onChange: (_keys: string[], rows: Receivable[]) => {
    props.state.batch.selected.value = rows
  },
  preserveSelectedRowKeys: false
}))
</script>
<template>
  <ReceivableFilters :state="state" />
  <div class="receivable-toolbar">
    <div class="receivable-toolbar-actions">
      <ReceivableBatchActions
        v-if="!cashier"
        :state="state.batch"
      />
      <slot name="toolbar" />
    </div>
    <ReceivableColumnSettings :state="columnState" />
  </div>
  <div class="receivable-scope">
    <span>
      {{ t('ReceivableLedger.currentScope') }}{{ archive.selected.value?.fullName || archive.selected.value?.name || t('Archive.allSpaces') }}
    </span>
    <span v-if="state.pageRows.value.length">
      {{ t('ReceivableLedger.amountAsOf') }}{{ state.calculatedDates.value }}
    </span>
  </div>
  <j-pro-table
    v-if="archive.projectId.value"
    ref="table"
    row-key="id"
    type="PAGE"
    mode="TABLE"
    :columns="columns"
    :params="params"
    :request="request"
    :no-pagination="false"
    :pagination="{ pageSize: 12 }"
    :alert-show="false"
    :body-style="{ padding: 0 }"
    :scroll="{ x: scrollWidth }"
    :row-selection="selection"
    @request-error="notify"
  >
    <template
      v-for="option in columnState.options.value.filter((item) => item.key !== 'actions' && item.key !== 'rowNumber')"
      :key="option.key"
      #[option.key]="row"
    >
      <ReceivableCell
        :row="row"
        :column="option"
        @detail="select(row)"
      />
    </template>
    <template #rowNumber="{ index }">{{ state.pageOffset.value + index + 1 }}</template>
    <template #actions="row">
      <ReceivableRowActions
        :row="row"
        :readonly="cashier"
        @select="(mode) => select(row, mode)"
        @action="(action) => (actionTarget = { row, action })"
      />
    </template>
    <template #headerCell="{ column }">
      <span>{{ column.title }}</span>
      <a-tooltip
        v-if="formulaKeys.includes(column.dataIndex)"
        :title="t('ReceivableLedger.formulas.' + column.dataIndex)"
      >
        <AIcon
          type="InfoCircleOutlined"
          class="receivable-formula-icon"
        />
      </a-tooltip>
    </template>
    <template #summary>
      <TableSummary v-if="state.pageRows.value.length">
        <TableSummaryRow>
          <TableSummaryCell :index="0" />
          <TableSummaryCell
            v-for="(column, index) in columns"
            :key="column.dataIndex"
            :index="index + 1"
            :align="column.align"
          >
            <strong v-if="index === 0">{{ t('Receivable.pageTotal') }}</strong>
            <strong v-else-if="Object.prototype.hasOwnProperty.call(state.totals.value, column.dataIndex)">
              {{ state.totals.value[column.dataIndex] }}
            </strong>
          </TableSummaryCell>
        </TableSummaryRow>
      </TableSummary>
    </template>
    <template #emptyText><CloudEmpty :description="t('Receivable.empty')" /></template>
  </j-pro-table>
</template>
<style scoped>
.receivable-toolbar {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}
.receivable-toolbar-actions {
  display: flex;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 8px;
}
.receivable-scope {
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
  color: var(--ant-color-text-secondary, #595959);
  font-size: 12px;
  margin: 8px 0 12px;
}
.receivable-formula-icon {
  margin-left: 5px;
  color: var(--ant-color-text-secondary, #595959);
  cursor: help;
}
:deep(.ant-table-summary) {
  background: var(--ant-color-fill-alter, #fafafa);
  font-variant-numeric: tabular-nums;
}
</style>
