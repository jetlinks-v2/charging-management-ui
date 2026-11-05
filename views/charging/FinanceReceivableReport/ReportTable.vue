<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useProjectContext } from '../../../hooks/project/useProjectContext'
import ReportRowDetail from '../FinanceReceivableReport/ReportRowDetail.vue'
import { useI18n } from 'vue-i18n'
import type { ReportRow } from '../../../api/financeReport'
import type { useReceivableReport } from '../../../hooks/finance-report/useReceivableReport'
const props = defineProps<{ state: ReturnType<typeof useReceivableReport> }>()
const { t } = useI18n()
const detail = ref<ReportRow>()
watch(
  useProjectContext().reportProjectIds,
  () => {
    detail.value = undefined
  },
  { deep: true }
)
const { active, ready, revision, selected, request } = props.state
const rowKey = (row: ReportRow) => JSON.stringify([row.id, row.projectId, row.subjectId, row.subjectName])
const selection = computed(() =>
  active.value.groupBy === 'DETAIL'
    ? undefined
    : {
        selectedRowKeys: selected.value.map(rowKey),
        onChange: (_keys: string[], rows: ReportRow[]) => (selected.value = rows)
      }
)
const columns = computed(() => {
  const fields =
    active.value.groupBy === 'DETAIL'
      ? ['projectName', 'fullName', 'customerName', 'subjectName', 'receivableDate', 'dueDate', 'collectionStatus']
      : [active.value.groupBy === 'PROJECT' ? 'projectName' : 'subjectName', 'billCount']
  return [
    ...fields.map((key) => ({
      title: t('Report.' + key),
      dataIndex: key,
      width: key === 'fullName' ? 230 : key === 'id' ? 280 : 140,
      scopedSlots: ['projectName', 'subjectName', 'collectionStatus'].includes(key)
    })),
    ...(active.value.groupBy === 'DETAIL'
      ? ['netAmount', 'receivedAmount', 'unreceivedAmount']
      : [
          'receivableAmount',
          'remissionAmount',
          'netAmount',
          'receivedAmount',
          'unreceivedAmount',
          'arrearsAmount',
          'collectionRate'
        ]
    ).map((key) => ({ title: t('Report.' + key), dataIndex: ['amounts', key], key, width: 170, align: 'right' })),
    ...(active.value.groupBy === 'DETAIL'
      ? [{ title: t('Finance.actions'), dataIndex: 'actions', scopedSlots: true, width: 90, fixed: 'right' }]
      : [])
  ]
})
const badge = (key?: string) => (key === 'PAID' ? 'green' : key === 'PARTIAL' ? 'orange' : 'default')
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
    :scroll="{ x: active.groupBy === 'DETAIL' ? 1640 : 1350 }"
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
    <template #collectionStatus="row">
      <a-tag :color="badge(row.collectionStatus)">{{ t('Report.' + row.collectionStatus) }}</a-tag>
    </template>
    <template #actions="row">
      <a-button
        type="link"
        @click="detail = row"
      >
        {{ t('Finance.detail') }}
      </a-button>
    </template>
    <template #emptyText>
      <CloudEmpty :description="t(state.failed.value ? 'Finance.failed' : 'Report.empty')" />
    </template>
  </j-pro-table>
  <ReportRowDetail
    v-if="detail"
    :row="detail"
    namespace="Report"
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
