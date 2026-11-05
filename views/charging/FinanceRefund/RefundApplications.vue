<script setup lang="ts">
import { computed } from 'vue'
import type { RefundApplicationView } from '../../../api/financeRefundApplication'
import ConditionFilter, { type ConditionFilterChangePayload } from '@jetlinks-web-core/components/ConditionFilter'
import { useRefundApplications } from '../../../hooks/finance-cashier/useRefundApplications'
import type { Query } from '../../../api/archive'
import RefundApplicationSummary from './RefundApplicationSummary.vue'
import RefundApplicationEdit from './RefundApplicationEdit.vue'
import RefundReviewDialog from './RefundReviewDialog.vue'
const {
  t,
  review,
  selected,
  projectId,
  table,
  status,
  terms,
  params,
  detail,
  loading,
  failed,
  open,
  target,
  action,
  reason,
  saving,
  uncertain,
  request,
  select,
  start,
  submit,
  cancel,
  notify,
  operations,
  editing,
  editLoading,
  editSaving,
  editModel,
  startEdit,
  saveEdit,
  closeEdit
} = useRefundApplications()
const rowKey = (row: RefundApplicationView) => row.line.id
const columns = computed(() => [
  { title: t('Refund.applicationNumber'), dataIndex: 'number', width: 190, ellipsis: true },
  { title: t('Setting.house'), dataIndex: ['line', 'fullName'], width: 230, ellipsis: true },
  { title: t('Setting.customer'), dataIndex: ['line', 'customerName'], width: 130 },
  { title: t('Receivable.subjectName'), dataIndex: ['line', 'subjectName'], width: 140 },
  { title: t('Refund.amount'), dataIndex: ['line', 'amount'], width: 120, align: 'right' as const },
  { title: t('Refund.sourceType'), dataIndex: 'sourceType', scopedSlots: true, width: 120 },
  { title: t('Refund.application'), dataIndex: 'status', scopedSlots: true, width: 120 },
  { title: t('Refund.method'), dataIndex: 'methodText', width: 110 },
  { title: t('Refund.refundedAt'), dataIndex: 'refundedAt', width: 180 },
  { title: t('Finance.actions'), dataIndex: 'actions', scopedSlots: true, width: 320, fixed: 'right' as const }
])
const detailColumns = computed<import('ant-design-vue').TableColumnsType>(() => [
  { title: t('Setting.house'), dataIndex: 'fullName', width: 240 },
  { title: t('Setting.customer'), dataIndex: 'customerName', width: 130 },
  { title: t('Receivable.subjectName'), dataIndex: 'subjectName', width: 150 },
  { title: t('Refund.amount'), dataIndex: 'amount', width: 120, align: 'right' }
])
const fields = computed(() =>
  ['fullName', 'customerName', 'subjectName'].map((key) => ({
    title: t(
      key === 'fullName' ? 'Setting.house' : key === 'customerName' ? 'Setting.customer' : 'Receivable.subjectName'
    ),
    dataIndex: key,
    search: { type: 'string' as const }
  }))
)
function filter(payload: ConditionFilterChangePayload) {
  terms.value = (payload.filter.terms || []) as Query['terms']
}
</script>
<template>
  <div class="refund-applications">
    <div class="refund-applications__filters">
      <a-select
        v-model:value="status"
        style="width: 160px"
        :options="
          ['PENDING', 'SUCCEEDED', 'REJECTED', 'ALL'].map((value) => ({
            value,
            label: value === 'ALL' ? t('Finance.all') : t('Refund.applicationStatus.' + value)
          }))
        "
      />
      <a-space>
        <j-permission-button
          hasPermission="charging/FinanceRefund:approve"
          :disabled="!selected.length || !!target"
          @click="start(selected, 'approve')"
        >
          {{ t('Refund.batchApprove') }}
        </j-permission-button>
        <j-permission-button
          hasPermission="charging/FinanceRefund:reject"
          :disabled="!selected.length || !!target"
          @click="start(selected, 'reject')"
        >
          {{ t('Refund.batchReject') }}
        </j-permission-button>
      </a-space>
      <ConditionFilter
        :fields="fields"
        @change="filter"
      />
    </div>
    <j-pro-table
      v-if="projectId"
      ref="table"
      :row-key="rowKey"
      type="PAGE"
      mode="TABLE"
      :row-selection="{
        selectedRowKeys: selected.map(rowKey),
        preserveSelectedRowKeys: true,
        onChange: (_keys: (string | number)[], rows: RefundApplicationView[]) => (selected = rows),
        getCheckboxProps: (row: RefundApplicationView) => ({ disabled: row.status !== 'PENDING' || !!target })
      }"
      :columns="columns"
      :params="params"
      :request="request"
      :no-pagination="false"
      :pagination="{ pageSize: 12 }"
      :alert-show="false"
      :body-style="{ padding: 0 }"
      :scroll="{ x: 1480 }"
      @request-error="notify"
    >
      <template #status="row">
        <a-tag :color="row.status === 'PENDING' ? 'orange' : row.status === 'SUCCEEDED' ? 'green' : 'default'">
          {{ t('Refund.applicationStatus.' + row.status) }}
        </a-tag>
      </template>
      <template #sourceType="row">{{ t('Refund.sources.' + row.sourceType) }}</template>
      <template #actions="row">
        <a-button
          type="link"
          @click="select(row.line.applicationId)"
        >
          {{ t('Finance.detail') }}
        </a-button>
        <template v-if="row.status === 'PENDING'">
          <j-permission-button
            type="link"
            hasPermission="charging/FinanceRefund:save"
            :loading="editLoading"
            @click="startEdit(row.line.applicationId)"
          >
            {{ t('Finance.edit') }}
          </j-permission-button>
          <j-permission-button
            type="link"
            hasPermission="charging/FinanceRefund:approve"
            @click="start(row, 'approve')"
          >
            {{ t('Refund.approve') }}
          </j-permission-button>
          <j-permission-button
            type="link"
            hasPermission="charging/FinanceRefund:reject"
            @click="start(row, 'reject')"
          >
            {{ t('Refund.reject') }}
          </j-permission-button>
        </template>
      </template>
      <template #emptyText><CloudEmpty :description="t('Refund.empty')" /></template>
    </j-pro-table>
    <CloudEmpty
      v-else
      :description="t('ProjectContext.choose')"
    />
    <JlDrawerShell
      v-if="open"
      :open="true"
      :width="960"
      :title="t('Refund.info')"
      @update:open="open = false"
    >
      <a-spin :spinning="loading">
        <template v-if="detail">
          <RefundApplicationSummary :application="detail.application" />
          <a-table
            :data-source="detail.lines"
            :columns="detailColumns"
            row-key="id"
            :pagination="false"
            :scroll="{ x: 700 }"
          />
          <SectionCard
            icon="HistoryOutlined"
            :title="t('Refund.logs')"
          >
            <a-timeline>
              <a-timeline-item
                v-for="entry in operations"
                :key="entry.id"
              >
                <strong>{{ t('Refund.logAction.' + entry.action) }}</strong>
                <div>{{ entry.modifierName }} · {{ new Date(entry.createTime).toLocaleString() }}</div>
                <div>{{ entry.reason }}</div>
              </a-timeline-item>
            </a-timeline>
          </SectionCard>
        </template>
        <CloudEmpty
          v-else-if="!loading"
          :description="t(failed ? 'Finance.failed' : 'Refund.empty')"
        />
      </a-spin>
    </JlDrawerShell>
    <RefundReviewDialog :state="review" />
    <RefundApplicationEdit
      v-if="editing"
      :model="editModel"
      :saving="editSaving"
      @save="saveEdit"
      @close="closeEdit"
    />
  </div>
</template>
<style scoped>
.refund-applications__filters {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 16px;
}
.refund-applications__filters > :last-child {
  flex: 1;
  min-width: 0;
}
.refund-applications :deep(.ant-form) {
  margin-top: 20px;
}
</style>
