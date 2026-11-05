<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { useFinanceSpaceScope } from '../../../hooks/finance-setting/useFinanceSpaceScope'
import { useReceivedLedger } from '../../../hooks/finance-cashier/useReceivedLedger'
const props = defineProps<{ archive: ReturnType<typeof useFinanceSpaceScope> }>()
const { t } = useI18n()
const state = useReceivedLedger(props.archive)
const { input, draft, applyFilters, resetFilters, request, notify, exporting, exportRows } = state
// 复用实收报表的平面筛选契约，不提供服务器无法执行的分组或 OR 条件。
const fields = ['fullName', 'customerName', 'paymentNo', 'collectorName'] as const
const columns = computed(() => [
  ...[
    'fullName',
    'customerName',
    'subjectName',
    'sourceType',
    'calcStartDate',
    'calcEndDate',
    'receivedAt',
    'methodText'
  ].map((key) => ({
    title: t('Received.' + key),
    dataIndex: key,
    width: key === 'fullName' ? 250 : 160,
    scopedSlots: ['sourceType', 'receivedAt'].includes(key)
  })),
  { title: t('Cashier.amount'), dataIndex: ['amounts', 'netAmount'], width: 160, align: 'right' },
  ...['sourceId', 'collectorName', 'remark'].map((key) => ({
    title: t('Received.' + key),
    dataIndex: key,
    width: key === 'sourceId' ? 300 : 180
  }))
])
</script>
<template>
  <div class="ledger-actions">
    <j-permission-button
      hasPermission="charging/FinancePayment:export"
      :loading="exporting"
      @click="exportRows('excel')"
    >
      <AIcon type="DownloadOutlined" />
      {{ t('Finance.export') }}
    </j-permission-button>
  </div>
  <a-form
    class="ledger-filters"
    layout="vertical"
    :model="draft"
    @finish="applyFilters"
  >
    <a-form-item
      v-for="key in fields"
      :key="key"
      :label="t('Received.' + key)"
    >
      <a-input
        v-model:value="draft[key]"
        :maxlength="200"
        allow-clear
      />
    </a-form-item>
    <a-space class="ledger-filter-actions">
      <a-button
        type="primary"
        html-type="submit"
      >
        {{ t('Report.query') }}
      </a-button>
      <a-button @click="resetFilters">{{ t('Report.reset') }}</a-button>
    </a-space>
  </a-form>
  <j-pro-table
    :key="archive.projectId.value"
    mode="TABLE"
    type="PAGE"
    row-key="id"
    :params="input"
    :request="request"
    :columns="columns"
    :pagination="{ pageSize: 12 }"
    :no-pagination="false"
    :alert-show="false"
    :body-style="{ padding: 0 }"
    :scroll="{ x: 2300 }"
    @request-error="notify"
  >
    <template #sourceType="row">
      <a-tag>{{ t('Received.' + row.sourceType) }}</a-tag>
    </template>
    <template #receivedAt="row">{{ row.receivedAt?.replace('T', ' ') }}</template>
    <template #emptyText><CloudEmpty :description="t('Cashier.noPayments')" /></template>
  </j-pro-table>
</template>
<style scoped>
.ledger-actions {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 12px;
}
.ledger-filters {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 12px 16px;
  margin-bottom: 16px;
}
.ledger-filters :deep(.ant-form-item) {
  flex: 1 1 160px;
  margin-bottom: 0;
}
.ledger-filter-actions {
  margin-bottom: 0;
}
</style>
