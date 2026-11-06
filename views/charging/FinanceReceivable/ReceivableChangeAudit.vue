<script setup lang="ts">
import { formatFinanceTime } from '../../../utils/financeTime'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useReceivableChangeAudit } from '../../../hooks/finance-receivable/useReceivableChangeAudit'
import ReceivableChangeAuditDetail from './ReceivableChangeAuditDetail.vue'
const props = defineProps<{ projectId: string }>()
const emit = defineEmits<{ saved: [] }>()
const { t } = useI18n()
const state = useReceivableChangeAudit(props, () => emit('saved'))
const { open, status, operation, keyword, search, table, params, request, inspect, show, notify, detailOpen } = state
const columns = computed(() => [
  { title: t('ChangeAudit.operationLabel'), dataIndex: 'operation', width: 110, scopedSlots: true },
  { title: t('Setting.house'), dataIndex: 'fullName', width: 260, ellipsis: true },
  { title: t('Setting.customer'), dataIndex: 'customerName', width: 120 },
  { title: t('Setting.subject'), dataIndex: 'subjectName', width: 130 },
  { title: t('Receivable.reason'), dataIndex: 'reason', width: 230, ellipsis: true },
  { title: t('ChangeAudit.applicant'), dataIndex: 'applicantName', width: 120 },
  { title: t('ChangeAudit.appliedAt'), dataIndex: 'createTime', width: 170, scopedSlots: true },
  { title: t('HistoricalAudit.status'), dataIndex: 'status', width: 110, scopedSlots: true },
  { title: t('ReceivableLedger.actions'), dataIndex: 'actions', width: 100, fixed: 'right', scopedSlots: true }
])
</script>
<template>
  <a-button
    :disabled="!projectId"
    @click="show"
  >
    <AIcon type="AuditOutlined" />
    {{ t('ChangeAudit.button') }}
  </a-button>
  <a-modal
    :open="open"
    :title="t('ChangeAudit.title')"
    :width="1240"
    :footer="null"
    :mask-closable="false"
    :closable="!detailOpen"
    :keyboard="!detailOpen"
    @cancel="open = false"
  >
    <a-tabs v-model:active-key="status">
      <a-tab-pane
        v-for="key in ['PENDING', 'APPROVED', 'REJECTED', 'ALL']"
        :key="key"
        :tab="t('ChangeAudit.status.' + key)"
      />
    </a-tabs>
    <div class="change-audit-filters">
      <a-select
        v-model:value="operation"
        :aria-label="t('ChangeAudit.operationLabel')"
        style="width: 160px"
      >
        <a-select-option
          v-for="key in ['ALL', 'ADJUST', 'SPLIT']"
          :key="key"
          :value="key"
        >
          {{ t('ChangeAudit.operation.' + key) }}
        </a-select-option>
      </a-select>
      <a-input-search
        v-model:value="keyword"
        :placeholder="t('Archive.searchSpace')"
        allow-clear
        style="width: 320px"
        @search="search = keyword.trim()"
      />
    </div>
    <j-pro-table
      v-if="open"
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
      :scroll="{ x: 1450 }"
      @request-error="notify"
    >
      <template #operation="row">{{ t('ChangeAudit.operation.' + row.operation) }}</template>
      <template #createTime="row">{{ formatFinanceTime(row.createTime) }}</template>
      <template #status="row">
        <a-tag :color="row.status === 'APPROVED' ? 'green' : row.status === 'REJECTED' ? 'red' : 'processing'">
          {{ t('ChangeAudit.status.' + row.status) }}
        </a-tag>
      </template>
      <template #actions="row">
        <a-button
          type="link"
          @click="inspect(row.id)"
        >
          {{ t('ChangeAudit.inspect') }}
        </a-button>
      </template>
      <template #emptyText><CloudEmpty /></template>
    </j-pro-table>
  </a-modal>
  <ReceivableChangeAuditDetail
    v-if="detailOpen"
    :state="state"
  />
</template>
<style scoped>
.change-audit-filters {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  margin: 4px 0 20px;
}
</style>
