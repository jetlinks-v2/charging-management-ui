<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { ReceivedRow } from '../../../api/financeReceivedReport'
import type { useReceivedReport } from '../../../hooks/finance-report/useReceivedReport'
const props = defineProps<{ state: ReturnType<typeof useReceivedReport> }>()
const { t } = useI18n()
const { active, ready, revision, request } = props.state
const groupField = computed(
  () =>
    ({ PROJECT: 'projectName', SUBJECT: 'subjectName', METHOD: 'methodText', SOURCE: 'sourceType', DETAIL: '' })[
      active.value.groupBy
    ]
)
const rowKey = (row: ReceivedRow) =>
  JSON.stringify([row.id, row.projectId, row.subjectId, row.subjectName, row.method, row.methodText, row.sourceType])
const columns = computed(() => {
  const fields =
    active.value.groupBy === 'DETAIL'
      ? [
          'projectName',
          'fullName',
          'customerName',
          'subjectName',
          'sourceId',
          'receivedAt',
          'calcStartDate',
          'calcEndDate',
          'methodText',
          'sourceType',
          'collectorName',
          'remark'
        ]
      : [groupField.value, 'rowCount']
  const amounts =
    active.value.receivedDateStart || active.value.receivedDateEnd
      ? ['incomeAmount', 'refundAmount', 'netAmount', 'currentPeriodAmount', 'otherPeriodAmount']
      : ['incomeAmount', 'refundAmount', 'netAmount']
  return [
    ...fields.map((key) => ({
      title: t('Received.' + key),
      dataIndex: key,
      width: key === 'fullName' ? 230 : key === 'sourceId' ? 300 : 160,
      scopedSlots: ['projectName', 'subjectName', 'methodText', 'sourceType', 'receivedAt'].includes(key)
    })),
    ...amounts.map((key) => ({
      title: t('Received.' + key),
      dataIndex: ['amounts', key],
      key,
      width: 170,
      align: 'right'
    }))
  ]
})
</script>
<template>
  <j-pro-table
    v-if="ready"
    :key="revision"
    mode="TABLE"
    type="PAGE"
    :request="request"
    :params="active"
    :columns="columns"
    :row-key="rowKey"
    :no-pagination="false"
    :pagination="{ pageSize: 12 }"
    :scroll="{ x: active.groupBy === 'DETAIL' ? 3200 : 1200 }"
    :body-style="{ padding: 0 }"
    :alert-show="false"
    class="report-table"
  >
    <template
      v-for="key in ['projectName', 'subjectName', 'methodText', 'sourceType'] as const"
      :key="key"
      #[key]="row"
    >
      <a-button
        v-if="key === groupField"
        type="link"
        @click="state.drill([row])"
      >
        {{ key === 'sourceType' ? t('Received.' + row.sourceType) : row[key] }}
      </a-button>
      <a-tag
        v-else-if="key === 'sourceType'"
        :color="row.amounts.netAmount.startsWith('-') ? 'orange' : 'blue'"
      >
        {{ t('Received.' + row.sourceType) }}
      </a-tag>
      <span v-else>{{ row[key] }}</span>
    </template>
    <template #receivedAt="row">{{ row.receivedAt?.replace('T', ' ') }}</template>
    <template #emptyText>
      <CloudEmpty :description="t(state.failed.value ? 'Finance.failed' : 'Received.empty')" />
    </template>
  </j-pro-table>
  <CloudEmpty
    v-else
    :description="t('Report.chooseProjects')"
  />
</template>
<style scoped>
.report-table :deep(td) {
  font-variant-numeric: tabular-nums;
}
</style>
