<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useProjectContext } from '../../../hooks/project/useProjectContext'
import InvoiceSourceDetail from './InvoiceSourceDetail.vue'
import { useI18n } from 'vue-i18n'
import type { InvoiceRow } from '../../../api/financeInvoiceReport'
import type { useInvoiceReport } from '../../../hooks/finance-report/useInvoiceReport'
const props = defineProps<{ state: ReturnType<typeof useInvoiceReport> }>()
const { t } = useI18n()
const detail = ref<InvoiceRow>()
watch(
  useProjectContext().reportProjectIds,
  () => {
    detail.value = undefined
  },
  { deep: true }
)
const { active, ready, revision, selected, request } = props.state
const rowKey = (r: InvoiceRow) => JSON.stringify([r.id, r.sourceType, r.projectId, r.subjectId, r.subjectName])
const selection = computed(() =>
  active.value.groupBy === 'DETAIL'
    ? undefined
    : {
        selectedRowKeys: selected.value.map(rowKey),
        onChange: (_keys: string[], rows: InvoiceRow[]) => (selected.value = rows)
      }
)
const columns = computed(() => {
  const fields =
    active.value.groupBy === 'DETAIL'
      ? ['projectName', 'fullName', 'buyerName', 'invoiceNo', 'invoiceStatus', 'invoiceDate']
      : [active.value.groupBy === 'PROJECT' ? 'projectName' : 'subjectName', 'rowCount']
  return [
    ...fields.map((key) => ({
      title: t('InvoiceReport.' + key),
      dataIndex: key,
      width: ['fullName', 'id', 'invoiceNo'].includes(key) ? 240 : 150,
      scopedSlots: ['projectName', 'subjectName', 'invoiceStatus', 'sourceType', 'invoiceType', 'invoiceDate'].includes(
        key
      )
    })),
    ...['receivableAmount', 'receivedAmount', 'invoicedAmount', 'uninvoicedAmount'].map((key) => ({
      title: t('InvoiceReport.' + key),
      dataIndex: ['amounts', key],
      key,
      width: 180,
      align: 'right'
    })),
    ...(active.value.groupBy === 'DETAIL'
      ? [{ title: t('Finance.actions'), dataIndex: 'actions', width: 100, fixed: 'right', scopedSlots: true }]
      : [])
  ]
})
const color = (status?: string) =>
  status === 'INVOICED' ? 'green' : status === 'PARTIAL' ? 'orange' : status === 'REVERSED' ? 'red' : 'default'
</script>
<template>
  <a-button
    v-if="selected.length"
    class="report-drill"
    @click="state.drill(selected)"
  >
    {{ t('Report.drillSelected', { count: selected.length }) }}
  </a-button>
  <j-pro-table
    v-if="ready"
    :key="revision"
    mode="TABLE"
    type="PAGE"
    :request="request"
    :params="active"
    :columns="columns"
    :row-key="rowKey"
    :row-selection="selection"
    :no-pagination="false"
    :pagination="{ pageSize: 12 }"
    :scroll="{ x: active.groupBy === 'DETAIL' ? 1780 : 1200 }"
    :body-style="{ padding: 0 }"
    :alert-show="false"
    class="report-table"
  >
    <template #projectName="row">
      <a-button
        v-if="active.groupBy === 'PROJECT'"
        type="link"
        @click="state.drill([row])"
      >
        {{ row.projectName }}
      </a-button>
      <span v-else>{{ row.projectName }}</span>
    </template>
    <template #subjectName="row">
      <a-button
        v-if="active.groupBy === 'SUBJECT'"
        type="link"
        @click="state.drill([row])"
      >
        {{ row.subjectName }}
      </a-button>
      <span v-else>{{ row.subjectName }}</span>
    </template>
    <template #invoiceStatus="row">
      <a-tag :color="color(row.invoiceStatus)">{{ t('InvoiceReport.' + row.invoiceStatus) }}</a-tag>
    </template>
    <template #sourceType="row">{{ row.sourceType ? t('InvoiceReport.' + row.sourceType) : '—' }}</template>
    <template #invoiceType="row">{{ row.invoiceType ? t('InvoiceReport.' + row.invoiceType) : '—' }}</template>
    <template #invoiceDate="row">{{ row.invoiceDate?.replace('T', ' ') || '—' }}</template>
    <template #actions="row">
      <a-button
        type="link"
        @click="detail = row"
      >
        {{ t('Finance.detail') }}
      </a-button>
    </template>
    <template #emptyText>
      <CloudEmpty :description="t(state.failed.value ? 'Finance.failed' : 'InvoiceReport.empty')" />
    </template>
  </j-pro-table>
  <InvoiceSourceDetail
    v-if="detail"
    :row="detail"
    @close="detail = undefined"
  />
  <CloudEmpty
    v-else-if="!ready"
    :description="t('Report.chooseProjects')"
  />
</template>
<style scoped>
.report-drill {
  margin-bottom: 12px;
}
.report-table :deep(td) {
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
</style>
