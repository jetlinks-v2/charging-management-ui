<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import ConditionFilter, { type ConditionFilterChangePayload } from '@jetlinks-web-core/components/ConditionFilter'
import {
  getHandover,
  queryHandoverDetails,
  exportHandoverDetails,
  type HandoverDetailRow
} from '../../../api/financeHandover'
import type { Query } from '../../../api/archive'
import type { useHandoverWorkspace } from '../../../hooks/finance-handover/useHandoverWorkspace'
import { useFinanceSpaceScope } from '../../../hooks/finance-setting/useFinanceSpaceScope'
import { useReportExport } from '../../../hooks/finance-report/useReportExport'
import FinanceLedgerSpace from '../components/FinanceLedgerSpace.vue'
const props = defineProps<{ state: ReturnType<typeof useHandoverWorkspace> }>()
const { t } = useI18n()
const { projectId, selected, blocked, changed, notify, select, act } = props.state
const space = useFinanceSpaceScope()
const filter = reactive({ handed: 'ALL', customerName: '', subjectName: '', occurredStart: '', occurredEnd: '' })
const { exportRows, exporting } = useReportExport({
  projectId,
  enabled: () => !!projectId.value,
  input: () => ({ ...filter, spaceId: space.selectedId.value }),
  title: () => t('Handover.details'),
  fallback: () => t('Finance.failed'),
  request: (input, format) => exportHandoverDetails(projectId.value, input, format)
})
const fields = computed(() =>
  ['customerName', 'subjectName', 'occurredStart', 'occurredEnd'].map((key) => ({
    title: t('Handover.' + key),
    dataIndex: key,
    search: { type: 'string' as const }
  }))
)
function apply({ filter: value }: ConditionFilterChangePayload) {
  Object.assign(filter, { customerName: '', subjectName: '', occurredStart: '', occurredEnd: '' })
  for (const term of value.terms || [])
    if ('column' in term && typeof term.column === 'string' && term.column in filter)
      filter[term.column as keyof typeof filter] = String(term.value || '')
}
const params = computed(() => ({ projectId: projectId.value, ...filter, spaceId: space.selectedId.value }))
const request = (q: Query, config?: { signal: AbortSignal }) =>
  queryHandoverDetails(
    projectId.value,
    { ...filter, spaceId: space.selectedId.value, pageIndex: q.pageIndex, pageSize: q.pageSize },
    config?.signal
  )
const columns = computed(() => [
  { title: t('Handover.sourceType'), dataIndex: 'type', width: 110, scopedSlots: true },
  { title: t('Handover.fullName'), dataIndex: 'fullName', width: 190 },
  { title: t('Handover.customer'), dataIndex: 'customerName', width: 120 },
  { title: t('Handover.subjectName'), dataIndex: 'subjectName', width: 140 },
  { title: t('Handover.amount'), dataIndex: 'amount', width: 120, align: 'right' },
  { title: t('Handover.cash'), dataIndex: 'cashAmount', width: 120, align: 'right' },
  { title: t('Handover.methodText'), dataIndex: 'methodText', width: 120 },
  { title: t('Handover.bankName'), dataIndex: 'bankName', width: 150 },
  { title: t('Handover.calcStartDate'), dataIndex: 'calcStartDate', width: 120 },
  { title: t('Handover.calcEndDate'), dataIndex: 'calcEndDate', width: 120 },
  { title: t('Handover.receiptNumbers'), dataIndex: 'receiptNumbers', width: 180 },
  { title: t('Handover.occurredAt'), dataIndex: 'occurredAt', width: 180 },
  { title: t('Handover.state'), dataIndex: 'state', width: 120, scopedSlots: true },
  { title: t('Finance.actions'), dataIndex: 'actions', width: 120, scopedSlots: true }
])
const mappedRequest = async (q: Query, config?: { signal: AbortSignal }) => {
  const response = await request(q, config)
  return {
    ...response,
    result: { ...response.result, data: response.result.data.map((row) => ({ ...row.line, ...row, key: row.id })) }
  }
}
async function cancel(row: HandoverDetailRow) {
  if (!row.batchId) return
  try {
    const project = projectId.value
    const detail = await getHandover(project, row.batchId)
    if (project === projectId.value) act(detail.batch, 'CANCEL')
  } catch (error) {
    notify(error)
  }
}
const selection = computed(() => ({
  selectedRowKeys: selected.value.map((row) => row.selectionKey || row.id),
  preserveSelectedRowKeys: true,
  onChange: (_keys: (string | number)[], rows: HandoverDetailRow[]) =>
    changed(
      _keys,
      rows.map((row) => ({
        id: row.sourceId,
        type: row.type,
        version: row.version,
        selectionKey: row.id,
        occurredAt: row.line.occurredAt,
        customerName: row.line.customerName,
        companyName: row.line.companyName,
        amount: row.line.amount,
        cashAmount: row.line.cashAmount,
        lineCount: 1
      }))
    ),
  getCheckboxProps: (row: HandoverDetailRow) => ({ disabled: blocked.value || !!row.batchId })
}))
watch([space.selectedId, () => filter.handed], () => {
  selected.value = []
})
</script>
<template>
  <div class="handover-details-layout">
    <FinanceLedgerSpace :state="space" />
    <div class="handover-details-table">
      <a-select
        v-model:value="filter.handed"
        :options="['ALL', 'NO', 'YES'].map((value) => ({ value, label: t('Handover.handed.' + value) }))"
        style="width: 160px; margin-bottom: 12px"
      />
      <a-button
        :loading="exporting"
        style="float: right"
        @click="exportRows('excel')"
      >
        Excel
      </a-button>
      <ConditionFilter
        :fields="fields"
        @change="apply"
      />
      <j-pro-table
        v-if="projectId"
        :key="projectId"
        :ref="
          (v: unknown) => {
            state.table.value = v as { reload: () => void }
          }
        "
        row-key="id"
        type="PAGE"
        mode="TABLE"
        :columns="columns"
        :params="params"
        :request="mappedRequest"
        :row-selection="selection"
        :no-pagination="false"
        :pagination="{ pageSize: 12 }"
        :alert-show="false"
        :body-style="{ padding: 0 }"
        :scroll="{ x: 2050, y: 420 }"
        @request-error="notify"
      >
        <template #type="row">
          {{
            ['RECEIVABLE', 'TEMPORARY', 'TOPUP', 'REFUND', 'WITHDRAW', 'TRANSFER_IN', 'TRANSFER_OUT'].includes(
              row.line.businessType
            )
              ? t('Handover.business.' + row.line.businessType)
              : t('Handover.source.' + row.type)
          }}
        </template>
        <template #state="row">
          <a-tag>{{ row.status ? t('Handover.status.' + row.status) : t('Handover.handed.NO') }}</a-tag>
        </template>
        <template #actions="row">
          <j-permission-button
            v-if="row.batchId && row.status === 'PENDING'"
            type="link"
            hasPermission="charging/FinanceHandover:cancel"
            :disabled="blocked"
            @click="cancel(row)"
          >
            {{ t('Handover.action.CANCEL') }}
          </j-permission-button>
          <a-button
            v-if="row.batchId"
            type="link"
            @click="select(row.batchId)"
          >
            {{ t('Finance.detail') }}
          </a-button>
        </template>
        <template #emptyText><CloudEmpty :description="t('Handover.noSources')" /></template>
      </j-pro-table>
    </div>
  </div>
</template>
<style scoped>
.handover-details-layout {
  display: flex;
  gap: 16px;
  min-height: 0;
}
.handover-details-table {
  flex: 1;
  min-width: 0;
}
@media (max-width: 900px) {
  .handover-details-layout {
    flex-direction: column;
  }
}
</style>
