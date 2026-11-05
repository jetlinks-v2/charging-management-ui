<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useProjectContext } from '../../../hooks/project/useProjectContext'
import ReportRowDetail from '../FinanceReceivableReport/ReportRowDetail.vue'
import { useI18n } from 'vue-i18n'
import type { ReceivedRow } from '../../../api/financeReceivedReport'
import type { useReceivedReport } from '../../../hooks/finance-report/useReceivedReport'
const props = defineProps<{ state: ReturnType<typeof useReceivedReport> }>()
const { t } = useI18n()
const detail = ref<ReceivedRow>()
watch(
  useProjectContext().reportProjectIds,
  () => {
    detail.value = undefined
  },
  { deep: true }
)
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
      ? ['projectName', 'fullName', 'customerName', 'sourceNo', 'receivedAt', 'methodText', 'sourceType']
      : [groupField.value, 'rowCount']
  const amounts =
    active.value.groupBy === 'DETAIL'
      ? ['netAmount']
      : active.value.receivedDateStart || active.value.receivedDateEnd
        ? ['incomeAmount', 'refundAmount', 'netAmount', 'currentPeriodAmount', 'otherPeriodAmount']
        : ['incomeAmount', 'refundAmount', 'netAmount']
  return [
    ...fields.map((key) => ({
      title: t('Received.' + key),
      dataIndex: key,
      width: key === 'fullName' ? 230 : key === 'sourceNo' ? 300 : 160,
      scopedSlots: ['projectName', 'subjectName', 'methodText', 'sourceType', 'receivedAt'].includes(key)
    })),
    ...amounts.map((key) => ({
      title: t('Received.' + key),
      dataIndex: ['amounts', key],
      key,
      width: 170,
      align: 'right'
    })),
    ...(active.value.groupBy === 'DETAIL'
      ? [{ title: t('Finance.actions'), dataIndex: 'actions', scopedSlots: true, width: 90, fixed: 'right' }]
      : [])
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
    :scroll="{ x: active.groupBy === 'DETAIL' ? 1520 : 1200 }"
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
    <template #actions="row">
      <a-button
        type="link"
        @click="detail = row"
      >
        {{ t('Finance.detail') }}
      </a-button>
    </template>
    <template #emptyText>
      <CloudEmpty :description="t(state.failed.value ? 'Finance.failed' : 'Received.empty')" />
    </template>
  </j-pro-table>
  <ReportRowDetail
    v-if="detail"
    :row="detail"
    namespace="Received"
    @close="detail = undefined"
  />
  <CloudEmpty
    v-else-if="!ready"
    :description="t('Report.chooseProjects')"
  />
</template>
<style scoped>
.report-table :deep(td) {
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
</style>
