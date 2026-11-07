<script setup lang="ts">
import { formatFinanceTime } from '../../../utils/financeTime'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useHistoricalAudit } from '../../../hooks/finance-receivable/useHistoricalAudit'
import type { HistoricalImportRecord } from '../../../api/financeReceivable'
import HistoricalAuditLines from './HistoricalAuditLines.vue'
import ImportLineEditor from '../FinanceImport/ImportLineEditor.vue'
import { collectionAuditAdapter, type CollectionImportKind } from '../../../api/financeCollectionImport'
import HistoricalAuditDecision from './HistoricalAuditDecision.vue'
const props = withDefaults(
  defineProps<{
    open: boolean
    projectId: string
    initialStatus: string
    readonly?: boolean
    kind?: CollectionImportKind
    permission?: string
  }>(),
  { readonly: false, permission: 'charging/FinanceReceivable' }
)
const emit = defineEmits<{ close: []; saved: [] }>()
const { t } = useI18n()
const state = useHistoricalAudit(
  props,
  () => emit('saved'),
  props.kind ? collectionAuditAdapter(props.kind) : undefined
)
const {
  status,
  keyword,
  searchField,
  searchRecords,
  resetRecords,
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
  { title: t('HistoricalAudit.progress'), dataIndex: 'progress', width: 190, scopedSlots: true },
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
    :title="t(readonly ? 'HistoricalAudit.history' : kind ? 'CollectionImport.auditTitle' : 'HistoricalAudit.title')"
    :width="1440"
    :style="{ maxWidth: 'calc(100vw - 40px)', top: '24px' }"
    :footer="null"
    :mask-closable="false"
    :closable="!busy && !decision && !state.editing.value && !record"
    :keyboard="!busy && !decision && !record && !state.editing.value"
    @cancel="emit('close')"
  >
    <div class="audit-toolbar">
      <div class="audit-search">
        <a-select
          v-model:value="searchField"
          :aria-label="t('CollectionImport.searchField')"
          :options="[
            { value: 'fileName', label: t('Subject.fileName') },
            { value: 'id', label: t('HistoricalAudit.recordId') }
          ]"
        />
        <a-input
          v-model:value="keyword"
          :placeholder="t(searchField === 'id' ? 'HistoricalAudit.recordId' : 'HistoricalAudit.keyword')"
          :aria-label="t('HistoricalAudit.keyword')"
          allow-clear
          @pressEnter="searchRecords"
        />
        <a-button
          type="primary"
          @click="searchRecords"
        >
          {{ t('HistoricalAudit.search') }}
        </a-button>
        <a-button @click="resetRecords">{{ t('ReceivableLedger.reset') }}</a-button>
      </div>
      <a-radio-group v-model:value="status">
        <a-radio-button
          v-for="value in ['PROCESSING', 'REVIEWING', 'PENDING', 'APPROVED', 'REJECTED', 'FAILED', 'ALL']"
          :key="value"
          :value="value"
        >
          {{ t('HistoricalAudit.tabs.' + value) }}
        </a-radio-button>
      </a-radio-group>
      <a-space
        v-if="!readonly"
        wrap
      >
        <j-permission-button
          :hasPermission="`${permission}:approve`"
          type="primary"
          :disabled="!selected.length || selected.length > state.maxBatches || busy"
          @click="start('approve')"
        >
          {{ t('HistoricalAudit.batchApprove') }}
        </j-permission-button>
        <j-permission-button
          :hasPermission="`${permission}:reject`"
          danger
          :disabled="!selected.length || selected.length > state.maxBatches || busy"
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
      :row-selection="readonly ? undefined : selection"
      :scroll="{ x: 1735, y: 430 }"
      :body-style="{ padding: 0 }"
      @request-error="notify"
    >
      <template #progress="row">
        <span v-if="['PROCESSING', 'REVIEWING'].includes(row.status)">
          {{ t('HistoricalAudit.phases.' + (row.phase || 'QUEUED')) }} · {{ row.processedCount || 0 }}
          <template v-if="row.totalCount">/ {{ row.totalCount }}</template>
        </span>
        <span v-else>—</span>
      </template>
      <template #errorCount="row">{{ row.errorCount || 0 }}</template>
      <template #totalCount="row">{{ row.totalCount }}</template>
      <template #successCount="row">{{ row.successCount }}</template>
      <template #rejectedCount="row">{{ row.rejectedCount || 0 }}</template>
      <template #status="row">
        <a-tag
          :color="
            row.status === 'APPROVED' || row.status === 'SUCCESS' || row.status === 'COMPLETED'
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
          <j-permission-button
            v-if="row.status === 'FAILED'"
            :hasPermission="`${permission}:import`"
            type="link"
            size="small"
            :disabled="busy"
            @click="state.retry(row)"
          >
            {{ t('HistoricalAudit.retry') }}
          </j-permission-button>
          <a-button
            type="link"
            size="small"
            @click="showLines(row)"
          >
            {{ t('HistoricalAudit.details') }}
          </a-button>
          <template v-if="!readonly && row.status === 'PENDING'">
            <j-permission-button
              :hasPermission="`${permission}:approve`"
              type="link"
              size="small"
              :disabled="busy"
              @click="start('approve', [row])"
            >
              {{ t('HistoricalAudit.approve') }}
            </j-permission-button>
            <j-permission-button
              :hasPermission="`${permission}:reject`"
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
      <template #emptyText>
        <CloudEmpty :description="t(readonly ? 'HistoricalAudit.recordsEmpty' : 'HistoricalAudit.empty')" />
      </template>
    </j-pro-table>
  </a-modal>
  <HistoricalAuditLines
    v-if="record"
    :state="state"
    :kind="kind"
    :permission="permission"
  />
  <HistoricalAuditDecision
    v-if="decision"
    :state="state"
    :collection="!!kind"
  />
  <ImportLineEditor
    v-if="state.editing.value && record"
    :project-id="projectId"
    :record="record"
    :line="state.editing.value"
    :kind="kind"
    @close="state.editing.value = undefined"
    @saved="state.edited"
  />
</template>
<style scoped>
.audit-toolbar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  margin: 8px 0 16px;
}
.audit-search {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.audit-search > .ant-select {
  width: 140px;
  flex: 0 0 140px;
}
.audit-search > .ant-input-affix-wrapper {
  width: 300px;
}
.audit-toolbar > :last-child {
  margin-left: auto;
}
</style>
