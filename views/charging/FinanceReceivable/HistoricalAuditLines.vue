<script setup lang="ts">
import { formatFinanceTime } from '../../../utils/financeTime'
import { computed } from 'vue'
import { collectionImportFields, historicalImportFields } from '../../../utils/financeImportFields'
import { useI18n } from 'vue-i18n'
import type { useHistoricalAudit } from '../../../hooks/finance-receivable/useHistoricalAudit'
import type { CollectionImportKind } from '../../../api/financeCollectionImport'
import type { HistoricalImportLine } from '../../../api/financeReceivable'
const props = withDefaults(
  defineProps<{ state: ReturnType<typeof useHistoricalAudit>; kind?: CollectionImportKind; permission?: string }>(),
  { permission: 'charging/FinanceReceivable' }
)
const { t } = useI18n()
const {
  record,
  lineStatus,
  house,
  customer,
  lineTable,
  lineParams,
  selectedLines,
  busy,
  requestLines,
  searchLines,
  resetLines,
  notify,
  start
} = props.state
const displayFields = computed(() => (props.kind ? collectionImportFields(props.kind) : historicalImportFields))
const columns = computed(() => [
  { title: t('HistoricalAudit.lineNumber'), dataIndex: 'lineNumber', width: 100 },
  { title: t('HistoricalAudit.status'), dataIndex: 'status', width: 110, scopedSlots: true },
  ...displayFields.value.map((field) => ({
    title: t(field.label),
    dataIndex: field.key,
    width: field.key === 'fullName' ? 240 : 160,
    scopedSlots: true
  })),
  { title: t('HistoricalAudit.reason'), dataIndex: 'reviewReason', width: 220, ellipsis: true },
  { title: t('HistoricalAudit.reviewedName'), dataIndex: 'reviewedName', width: 130 },
  { title: t('HistoricalAudit.reviewedAt'), dataIndex: 'reviewedAt', width: 175, scopedSlots: true },
  { title: t('Finance.actions'), dataIndex: 'actions', width: 240, fixed: 'right', scopedSlots: true }
])
const selection = computed(() => ({
  selectedRowKeys: selectedLines.value.map((row) => row.id),
  preserveSelectedRowKeys: false,
  onChange: (_keys: string[], rows: HistoricalImportLine[]) => {
    selectedLines.value = rows
  },
  getCheckboxProps: (row: HistoricalImportLine) => ({
    disabled: record.value?.status !== 'PENDING' || row.status !== 'PENDING' || busy.value
  })
}))
</script>
<template>
  <a-modal
    :open="true"
    :title="t('HistoricalAudit.details') + ' — ' + record?.fileName"
    :width="1500"
    :style="{ maxWidth: 'calc(100vw - 32px)', top: '40px' }"
    :footer="null"
    :mask-closable="false"
    :closable="!busy && !state.decision.value && !state.editing.value"
    :keyboard="!busy && !state.decision.value && !state.editing.value"
    @cancel="record = undefined"
  >
    <a-alert
      v-if="record?.errorMessage"
      type="error"
      show-icon
      :message="record.errorMessage"
      class="audit-result"
    />
    <a-alert
      v-if="record?.status === 'SUCCESS'"
      type="info"
      show-icon
      :message="t('HistoricalAudit.legacy')"
      class="audit-result"
    />
    <div class="audit-lines-toolbar">
      <a-input
        v-model:value="house"
        :placeholder="t('ReceivableLedger.fullName')"
        :aria-label="t('ReceivableLedger.fullName')"
        allow-clear
        @pressEnter="searchLines"
      />
      <a-input
        v-model:value="customer"
        :placeholder="t('ReceivableLedger.customerName')"
        :aria-label="t('ReceivableLedger.customerName')"
        allow-clear
        @pressEnter="searchLines"
      />
      <a-button @click="searchLines">
        <AIcon type="SearchOutlined" />
        {{ t('HistoricalAudit.search') }}
      </a-button>
      <a-button @click="resetLines">{{ t('ReceivableLedger.reset') }}</a-button>
      <a-select
        v-model:value="lineStatus"
        :aria-label="t('HistoricalAudit.status')"
        :options="
          ['ALL', 'PENDING', 'APPROVED', 'REJECTED'].map((value) => ({
            value,
            label: t('HistoricalAudit.tabs.' + value)
          }))
        "
      />
      <a-space
        v-if="!state.readonly.value && record?.status === 'PENDING'"
        wrap
      >
        <j-permission-button
          :hasPermission="`${permission}:approve`"
          type="primary"
          :disabled="!selectedLines.length || selectedLines.length > 100 || busy"
          @click="record && start('approve', [record], selectedLines)"
        >
          {{ t('HistoricalAudit.approve') }}
        </j-permission-button>
        <j-permission-button
          :hasPermission="`${permission}:reject`"
          danger
          :disabled="!selectedLines.length || selectedLines.length > 100 || busy"
          @click="record && start('reject', [record], selectedLines)"
        >
          {{ t('HistoricalAudit.reject') }}
        </j-permission-button>
      </a-space>
    </div>
    <j-pro-table
      ref="lineTable"
      row-key="id"
      type="PAGE"
      mode="TABLE"
      :columns="columns"
      :request="requestLines"
      :params="lineParams"
      :pagination="{ pageSize: 12 }"
      :no-pagination="false"
      :alert-show="false"
      :row-selection="state.readonly.value ? undefined : selection"
      :scroll="{ x: displayFields.length * 160 + 1000, y: 430 }"
      :body-style="{ padding: 0 }"
      @request-error="notify"
    >
      <template
        v-for="field in displayFields"
        :key="field.key"
        #[field.key]="row"
      >
        {{
          field.type === 'datetime'
            ? formatFinanceTime(row.payload?.[field.key] ?? row.receivable[field.key])
            : row.payload?.[field.key] ?? row.receivable[field.key] ?? '—'
        }}
      </template>
      <template #actions="row">
        <a-space
          v-if="!state.readonly.value && record?.status === 'PENDING' && row.status === 'PENDING'"
          :size="0"
        >
          <j-permission-button
            type="link"
            :hasPermission="`${permission}:${kind ? 'import-edit' : 'approve'}`"
            :disabled="busy"
            @click="state.editLine(row)"
          >
            {{ t('CollectionImport.edit') }}
          </j-permission-button>
          <j-permission-button
            type="link"
            :hasPermission="`${permission}:approve`"
            :disabled="busy"
            @click="record && start('approve', [record], [row])"
          >
            {{ t('HistoricalAudit.approve') }}
          </j-permission-button>
          <j-permission-button
            type="link"
            danger
            :hasPermission="`${permission}:reject`"
            :disabled="busy"
            @click="record && start('reject', [record], [row])"
          >
            {{ t('HistoricalAudit.reject') }}
          </j-permission-button>
        </a-space>
        <span v-else>—</span>
      </template>
      <template #status="row">
        <a-tag :color="row.status === 'APPROVED' ? 'success' : row.status === 'REJECTED' ? 'error' : 'processing'">
          {{ t('HistoricalAudit.states.' + row.status) }}
        </a-tag>
      </template>
      <template #reviewedAt="row">
        {{ row.reviewedAt ? formatFinanceTime(row.reviewedAt) : '—' }}
      </template>
      <template #emptyText><CloudEmpty :description="t('HistoricalAudit.linesEmpty')" /></template>
    </j-pro-table>
  </a-modal>
</template>
<style scoped>
.audit-result {
  margin-bottom: 16px;
}
.audit-lines-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}
.audit-lines-toolbar > :is(.ant-input-affix-wrapper, .ant-select) {
  width: 190px;
}
.audit-lines-toolbar > :last-child {
  margin-left: auto;
}
</style>
