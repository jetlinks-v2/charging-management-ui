<script setup lang="ts">
import { formatFinanceTime } from '../../../utils/financeTime'
import { collectionTypeColors, handoverStateColors, handoverStates } from '../../../utils/collectionDisplay'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import ConditionFilter from '@jetlinks-web-core/components/ConditionFilter'
import type { useFinanceSpaceScope } from '../../../hooks/finance-setting/useFinanceSpaceScope'
import { useReceivedLedger } from '../../../hooks/finance-cashier/useReceivedLedger'
const props = defineProps<{ archive: ReturnType<typeof useFinanceSpaceScope> }>()
const { t } = useI18n()
const state = useReceivedLedger(props.archive)
const { input, filter, request, notify, exporting, exportRows } = state
// 复用实收报表的平面筛选契约，不提供服务器无法执行的分组或 OR 条件。
const fields = computed(() => [
  ...['fullName', 'customerName', 'collectorName'].map((key) => ({
    title: t('Received.' + key),
    dataIndex: key,
    search: { type: 'string', termOptions: ['like'], defaultTermType: 'like' }
  })),
  {
    title: t('Received.handoverState'),
    dataIndex: 'handoverState',
    search: {
      type: 'select',
      termOptions: ['eq'],
      defaultTermType: 'eq',
      options: handoverStates.map((value) => ({ value, label: t('Received.handover.' + value) }))
    }
  }
])
const columns = computed(() => [
  ...[
    'fullName',
    'customerName',
    'subjectName',
    'sourceType',
    'handoverState',
    'calcStartDate',
    'calcEndDate',
    'receivedAt',
    'methodText'
  ].map((key) => ({
    title: t('Received.' + key),
    dataIndex: key,
    width: key === 'fullName' ? 250 : 160,
    scopedSlots: ['sourceType', 'handoverState', 'receivedAt'].includes(key)
  })),
  { title: t('Cashier.amount'), dataIndex: ['amounts', 'netAmount'], width: 160, align: 'right' },
  ...['collectorName', 'remark'].map((key) => ({
    title: t('Received.' + key),
    dataIndex: key,
    width: 180
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
  <ConditionFilter
    class="collection-filter"
    :fields="fields"
    :disabled="exporting"
    @change="filter"
  />
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
    :scroll="{ x: 2000 }"
    @request-error="notify"
  >
    <template #sourceType="row">
      <a-tag :color="collectionTypeColors[row.sourceType]">{{ t('Received.' + row.sourceType) }}</a-tag>
    </template>
    <template #handoverState="row">
      <a-tag
        v-if="row.handoverState"
        :color="handoverStateColors[row.handoverState]"
      >
        {{ t('Received.handover.' + row.handoverState) }}
      </a-tag>
      <span v-else>—</span>
    </template>
    <template #receivedAt="row">{{ formatFinanceTime(row.receivedAt) }}</template>
    <template #emptyText><CloudEmpty :description="t('Cashier.noPayments')" /></template>
  </j-pro-table>
</template>
<style scoped>
.ledger-actions {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 12px;
}
</style>
