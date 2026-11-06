<script setup lang="ts">
import { formatFinanceTime } from '../../../utils/financeTime'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useTaxHistory } from '../../../hooks/finance-tax/useTaxHistory'
const props = defineProps<{
  open: boolean
  projectId: string
  taxId?: string
  companies?: { value: string; label: string }[]
}>()
const emit = defineEmits<{ close: [] }>()
const { t } = useI18n()
const { table, params, request, failure, changes, notify, companyFilter, statusFilter } = useTaxHistory(props)
const columns = computed(() => [
  { title: t('FinanceTax.time'), dataIndex: 'createTime', width: 170, scopedSlots: true },
  { title: t('FinanceTax.operator'), dataIndex: 'modifierName', width: 120 },
  ...(props.taxId
    ? [
        { title: t('FinanceTax.operationLabel'), dataIndex: 'operation', width: 110, scopedSlots: true },
        { title: t('FinanceTax.changes'), dataIndex: 'changes', scopedSlots: true }
      ]
    : [
        { title: t('Finance.companyName'), dataIndex: 'companyId', width: 280, scopedSlots: true },
        { title: t('FinanceTax.fileName'), dataIndex: 'fileName', width: 220 },
        { title: t('FinanceTax.enabled'), dataIndex: 'status', width: 110, scopedSlots: true },
        { title: t('FinanceTax.totalCount'), dataIndex: 'totalCount', width: 90 },
        { title: t('FinanceTax.count'), dataIndex: 'successCount', width: 80 },
        { title: t('FinanceTax.errorCount'), dataIndex: 'errorCount', width: 90 },
        { title: t('FinanceTax.finishTime'), dataIndex: 'finishTime', width: 180, scopedSlots: true },
        { title: t('Finance.actions'), dataIndex: 'actions', width: 110, scopedSlots: true }
      ])
])
</script>
<template>
  <JlDrawerShell
    :open="open"
    :width="1200"
    icon="HistoryOutlined"
    :title="t('FinanceTax.' + (taxId ? 'operations' : 'importRecords'))"
    @update:open="emit('close')"
  >
    <div
      v-if="!taxId"
      class="tax-history-filters"
    >
      <a-select
        v-model:value="companyFilter"
        :options="companies || []"
        allow-clear
        show-search
        option-filter-prop="label"
        :placeholder="t('FinanceTax.allCompanies')"
      />
      <a-select
        v-model:value="statusFilter"
        allow-clear
        :placeholder="t('FinanceTax.allStates')"
        :options="
          ['PROCESSING', 'SUCCESS', 'FAILED'].map((value) => ({
            value,
            label: t('FinanceTax.importStatus.' + value)
          }))
        "
      />
    </div>
    <j-pro-table
      v-if="open"
      ref="table"
      row-key="id"
      mode="TABLE"
      type="PAGE"
      :columns="columns"
      :params="params"
      :request="request"
      :pagination="{ pageSize: 10 }"
      :scroll="{ x: taxId ? 850 : 1580 }"
      :alert-show="false"
      :body-style="{ padding: 0 }"
      @request-error="notify"
    >
      <template #createTime="row">{{ formatFinanceTime(row.createTime) }}</template>
      <template #companyId="row">
        {{ companies?.find((company) => company.value === row.companyId)?.label || '—' }}
      </template>
      <template #finishTime="row">
        {{ row.finishTime ? formatFinanceTime(row.finishTime) : '—' }}
      </template>
      <template #operation="row">{{ t('FinanceTax.operation.' + row.operation) }}</template>
      <template #changes="row">
        <span class="tax-change-text">{{ changes(row) }}</span>
      </template>
      <template #status="row">
        <a-tag
          :color="row.status === 'SUCCESS' ? 'success' : row.status === 'FAILED' ? 'error' : 'processing'"
        >
          {{ t('FinanceTax.importStatus.' + row.status) }}
        </a-tag>
      </template>
      <template #actions="row">
        <a-button
          v-if="row.status === 'FAILED'"
          type="link"
          @click="failure(row)"
        >
          {{ t('FinanceTax.failureReason') }}
        </a-button>
      </template>
      <template #emptyText><CloudEmpty :description="t('FinanceTax.noHistory')" /></template>
    </j-pro-table>
    <template #foot>
      <a-button @click="emit('close')">{{ t('Finance.close') }}</a-button>
    </template>
  </JlDrawerShell>
</template>
<style scoped>
.tax-change-text {
  overflow-wrap: anywhere;
}
.tax-history-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 16px;
}
.tax-history-filters .ant-select:first-child {
  width: 360px;
  max-width: 100%;
}
.tax-history-filters .ant-select {
  min-width: 160px;
}
</style>
