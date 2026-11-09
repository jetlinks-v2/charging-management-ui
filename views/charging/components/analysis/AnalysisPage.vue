<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { AnalysisKind, AnalysisRow } from '../../../../api/financeAnalysis'
import { useAnalysisReport } from '../../../../hooks/finance-report/useAnalysisReport'
import { formatFinanceTime } from '../../../../utils/financeTime'
import FinancePage from '../FinancePage.vue'
import ProjectScopeBar from '../ProjectScopeBar.vue'
import ReportSummary from '../ReportSummary.vue'
import ReportExportActions from '../ReportExportActions.vue'
import ReportPdfPreview from '../ReportPdfPreview.vue'
import AnalysisFilters from './AnalysisFilters.vue'
import ArrearsChart from './ArrearsChart.vue'
import '../report-layout.css'
const props = defineProps<{ kind: AnalysisKind }>(),
  { t } = useI18n(),
  state = useAnalysisReport(props.kind)
const { active, result, loading, failed, ready, revision, parent, detail, exporting, previewOpen, previewUrl } = state
const columnLabel = (key: string, fallback?: string) =>
  key === 'opening' && props.kind === 'monthly'
    ? t('Analysis.openingDebt')
    : t('Analysis.columns.' + key, fallback || key)
const summaryItems = computed(() =>
  state.config.totals.map((key) => ({
    label: columnLabel(key).replace('（元）', ''),
    value: result.value?.summary[key]?.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ','),
    unit: key.endsWith('Count') || ['periods', 'giftMonths'].includes(key) ? '' : t('Report.currency')
  }))
)
const display = (row: AnalysisRow, key: string) => {
  const value = row[key]
  if (value == null || value === '') return '—'
  if (['type', 'operation', 'age', 'state'].includes(key)) return t('Analysis.enums.' + value)
  if (['occurredAt', 'approvedAt'].includes(key)) return formatFinanceTime(String(value))
  if (result.value?.columns.some((c) => c.key === key && c.money)) {
    const [whole, cents] = String(value).split('.')
    return whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (cents === undefined ? '' : '.' + cents)
  }
  return value
}
// ProTable captures named slots when mounted, before the asynchronous column response.
const formattedKeys = [
  'type',
  'operation',
  'age',
  'state',
  'occurredAt',
  'approvedAt',
  'debt',
  'overdue',
  'notDue',
  'days30',
  'days90',
  'days180',
  'days365',
  'over365',
  'undated',
  'opening',
  'accrual',
  'settled',
  'priorYears',
  'priorMonths',
  'currentMonth',
  'future',
  'cash',
  'offset',
  'restored',
  'income',
  'refund',
  'transferIn',
  'transferOut',
  'deduct',
  'offsetReturn',
  'other',
  'movement',
  'closing',
  'beforeBalance',
  'amount',
  'afterBalance',
  'principal',
  'discount',
  'before',
  'adjustment',
  'after',
  'remission',
  'lateRemission'
]
const columns = computed(() => [
  ...(result.value?.columns || []).map((c) => ({
    title: columnLabel(c.key, c.label),
    dataIndex: c.key,
    width: c.money ? 170 : c.key === 'billNo' ? 285 : c.key === 'fullName' ? 240 : 160,
    ellipsis: true,
    align: c.money ? 'right' : 'left',
    scopedSlots: formattedKeys.includes(c.key)
  })),
  { title: t('Finance.actions'), dataIndex: 'actions', scopedSlots: true, width: 90, fixed: 'right' }
])
const rowKey = (row: AnalysisRow) =>
  JSON.stringify([
    row.id,
    row.projectId,
    row.subjectId,
    row.subjectName,
    row.spaceId,
    row.customerId,
    row.month,
    row.type,
    row.operation,
    row.age,
    row.activityId
  ])
</script>
<template>
  <FinancePage fixed>
    <ProjectScopeBar multiple />
    <section class="report-workspace">
      <AnalysisFilters :state="state">
        <ReportExportActions
          :permission="'charging/' + state.config.route + ':export'"
          :state="{ ready, loading, failed, exporting }"
          :detail-only="['DETAIL', 'PERIOD'].includes(active.groupBy)"
          @export="state.exportRows"
        />
      </AnalysisFilters>
      <div class="report-toolbar">
        <a-radio-group
          :value="active.groupBy"
          :disabled="exporting"
          @change="state.group($event.target.value)"
        >
          <a-radio-button
            v-for="group in state.config.groups"
            :key="group"
            :value="group"
          >
            {{ t('Analysis.groups.' + group) }}
          </a-radio-button>
        </a-radio-group>
        <a-button
          v-if="parent"
          type="link"
          @click="state.back"
        >
          <AIcon type="ArrowLeftOutlined" />
          {{ t('ReportUI.back') }}
        </a-button>
      </div>
      <ReportSummary
        :label="t('Report.total')"
        :items="summaryItems"
      />
      <div
        class="report-data"
        :class="{ 'analysis-with-aging': kind === 'arrears' && result && active.groupBy !== 'DETAIL' }"
      >
        <ArrearsChart
          v-if="kind === 'arrears' && result && active.groupBy !== 'DETAIL'"
          :summary="result.summary"
          @drill="state.drill"
        />
        <div class="analysis-table">
          <j-pro-table
            v-if="ready"
            :key="revision"
            mode="TABLE"
            type="PAGE"
            :request="state.request"
            :params="active"
            :columns="columns"
            :row-key="rowKey"
            :no-pagination="false"
            :pagination="{ pageSize: 12 }"
            :scroll="{ x: Math.max(columns.length * 170, 1200), y: 'auto' }"
            :body-style="{ padding: 0 }"
            :alert-show="false"
            class="report-table"
          >
            <template
              v-for="key in formattedKeys"
              :key="key"
              #[key]="row"
            >
              <a-tag
                v-if="['type', 'operation', 'age', 'state'].includes(key)"
                :color="key === 'age' ? 'orange' : key === 'state' ? 'green' : 'blue'"
              >
                {{ display(row, key) }}
              </a-tag>
              <span v-else>{{ display(row, key) }}</span>
            </template>
            <template #actions="row">
              <a-button
                type="link"
                @click=";['DETAIL', 'PERIOD'].includes(active.groupBy) ? (detail = row) : state.drill(row)"
              >
                {{ t(['DETAIL', 'PERIOD'].includes(active.groupBy) ? 'Finance.detail' : 'Analysis.drill') }}
              </a-button>
            </template>
            <template #emptyText>
              <CloudEmpty :description="t(failed ? 'Finance.failed' : 'Analysis.empty')" />
            </template>
          </j-pro-table>
          <CloudEmpty
            v-else
            :description="t('Report.chooseProjects')"
          />
        </div>
      </div>
    </section>
    <a-modal
      v-if="detail"
      :visible="true"
      :title="t('Finance.detail')"
      :width="880"
      :footer="null"
      @cancel="detail = undefined"
    >
      <a-descriptions
        bordered
        :column="2"
        size="small"
      >
        <a-descriptions-item
          v-for="column in result?.columns || []"
          :key="column.key"
          :label="columnLabel(column.key, column.label)"
        >
          {{ display(detail, column.key) }}
        </a-descriptions-item>
      </a-descriptions>
    </a-modal>
    <ReportPdfPreview
      :state="{ open: previewOpen, url: previewUrl, title: t('Analysis.' + kind), filename: t('Analysis.' + kind) }"
      @close="state.closePreview"
    />
  </FinancePage>
</template>

<style scoped>
.analysis-with-aging {
  flex-direction: row;
  gap: 16px;
}
.analysis-table {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
  min-height: 0;
}
</style>
