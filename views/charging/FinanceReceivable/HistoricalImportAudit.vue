<script setup lang="ts">
import { formatFinanceTime } from '../../../utils/financeTime'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useHistoricalAudit } from '../../../hooks/finance-receivable/useHistoricalAudit'
import type { HistoricalImportRecord } from '../../../api/financeReceivable'
import HistoricalAuditLines from './HistoricalAuditLines.vue'
import HistoricalAuditDecision from './HistoricalAuditDecision.vue'
const props = defineProps<{ open: boolean; projectId: string; initialStatus: string }>()
const emit = defineEmits<{ close: []; saved: [] }>()
const { t } = useI18n()
const state = useHistoricalAudit(props, () => emit('saved'))
const {
  status,
  keyword,
  searchKeyword,
  table,
  params,
  selected,
  busy,
  decision,
  record,
  request,
  notify,
  showLines,
  start
} = state
const columns = computed(() => [
  { title: t('HistoricalAudit.recordId'), dataIndex: 'id', width: 210, ellipsis: true },
  { title: t('Subject.fileName'), dataIndex: 'fileName', width: 210, ellipsis: true },
  ...['totalCount', 'successCount', 'rejectedCount', 'errorCount', 'status'].map((key) => ({
    title: t(
      key === 'totalCount'
        ? 'Subject.totalRows'
        : key === 'successCount'
          ? 'HistoricalAudit.approvedCount'
          : key === 'rejectedCount'
            ? 'HistoricalAudit.rejectedCount'
            : key === 'errorCount'
              ? 'HistoricalAudit.errorCount'
              : 'HistoricalAudit.status'
    ),
    dataIndex: key,
    width: 110,
    scopedSlots: true
  })),
  { title: t('Subject.failureDetails'), dataIndex: 'errorMessage', width: 230, ellipsis: true, scopedSlots: true },
  { title: t('Subject.importedBy'), dataIndex: 'operatorName', width: 130 },
  { title: t('Subject.importTime'), dataIndex: 'createTime', width: 175, scopedSlots: true },
  { title: t('Finance.actions'), dataIndex: 'actions', width: 230, fixed: 'right', scopedSlots: true }
])
const selection = computed(() => ({
  selectedRowKeys: selected.value.map((row) => row.id),
  preserveSelectedRowKeys: false,
  onChange: (_keys: string[], rows: HistoricalImportRecord[]) => {
    selected.value = rows
  },
  getCheckboxProps: (row: HistoricalImportRecord) => ({ disabled: row.status !== 'PENDING' || busy.value })
}))
</script>
<template>
  <a-modal
    :open="open"
    :title="t('HistoricalAudit.title')"
    :width="1440"
    :style="{ maxWidth: 'calc(100vw - 40px)', top: '24px' }"
    :footer="null"
    :mask-closable="false"
    :closable="!busy && !decision"
    :keyboard="!busy && !decision && !record"
    @cancel="emit('close')"
  >
    <div class="audit-toolbar">
      <a-input-search
        v-model:value="keyword"
        :placeholder="t('HistoricalAudit.keyword')"
        :aria-label="t('HistoricalAudit.keyword')"
        allow-clear
        @search="searchKeyword = keyword.trim()"
      />
      <a-radio-group v-model:value="status">
        <a-radio-button
          v-for="value in ['PENDING', 'APPROVED', 'REJECTED', 'FAILED', 'ALL']"
          :key="value"
          :value="value"
        >
          {{ t('HistoricalAudit.tabs.' + value) }}
        </a-radio-button>
      </a-radio-group>
      <a-space wrap>
        <j-permission-button
          :hasPermission="'charging/FinanceReceivable:approve'"
          type="primary"
          :disabled="!selected.length || selected.length > 100 || busy"
          @click="start('approve')"
        >
          {{ t('HistoricalAudit.batchApprove') }}
        </j-permission-button>
        <j-permission-button
          :hasPermission="'charging/FinanceReceivable:reject'"
          danger
          :disabled="!selected.length || selected.length > 100 || busy"
          @click="start('reject')"
        >
          {{ t('HistoricalAudit.batchReject') }}
        </j-permission-button>
      </a-space>
    </div>
    <j-pro-table
      v-if="open"
      ref="table"
      row-key="id"
      type="PAGE"
      mode="TABLE"
      :columns="columns"
      :request="request"
      :params="params"
      :pagination="{ pageSize: 12 }"
      :no-pagination="false"
      :alert-show="false"
      :row-selection="selection"
      :scroll="{ x: 1735, y: 430 }"
      :body-style="{ padding: 0 }"
      @request-error="notify"
    >
      <template #errorCount="row">{{ row.errorCount || 0 }}</template>
      <template #totalCount="row">{{ row.totalCount }}</template>
      <template #successCount="row">{{ row.successCount }}</template>
      <template #rejectedCount="row">{{ row.rejectedCount || 0 }}</template>
      <template #status="row">
        <a-tag
          :color="
            row.status === 'APPROVED' || row.status === 'SUCCESS'
              ? 'success'
              : row.status === 'REJECTED' || row.status === 'FAILED'
                ? 'error'
                : 'processing'
          "
        >
          {{ t('HistoricalAudit.states.' + row.status) }}
        </a-tag>
      </template>
      <template #errorMessage="row">
        <a-tooltip :title="row.errorMessage">
          <span>{{ row.errorMessage || '—' }}</span>
        </a-tooltip>
      </template>
      <template #createTime="row">{{ formatFinanceTime(row.createTime) }}</template>
      <template #actions="row">
        <a-space :size="0">
          <a-button
            type="link"
            size="small"
            @click="showLines(row)"
          >
            {{ t('HistoricalAudit.details') }}
          </a-button>
          <template v-if="row.status === 'PENDING'">
            <j-permission-button
              :hasPermission="'charging/FinanceReceivable:approve'"
              type="link"
              size="small"
              :disabled="busy"
              @click="start('approve', [row])"
            >
              {{ t('HistoricalAudit.approve') }}
            </j-permission-button>
            <j-permission-button
              :hasPermission="'charging/FinanceReceivable:reject'"
              type="link"
              size="small"
              danger
              :disabled="busy"
              @click="start('reject', [row])"
            >
              {{ t('HistoricalAudit.reject') }}
            </j-permission-button>
          </template>
        </a-space>
      </template>
      <template #emptyText><CloudEmpty :description="t('HistoricalAudit.empty')" /></template>
    </j-pro-table>
  </a-modal>
  <HistoricalAuditLines
    v-if="record"
    :state="state"
  />
  <HistoricalAuditDecision
    v-if="decision"
    :state="state"
  />
</template>
<style scoped>
.audit-toolbar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  margin: 8px 0 20px;
}
.audit-toolbar > :first-child {
  width: 220px;
}
.audit-toolbar > :last-child {
  margin-left: auto;
}
</style>
