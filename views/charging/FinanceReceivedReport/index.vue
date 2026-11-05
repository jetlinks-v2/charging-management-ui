<script setup lang="ts">
import FinancePage from '../components/FinancePage.vue'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { ReceivedGroup } from '../../../api/financeReceivedReport'
import { useReceivedReport } from '../../../hooks/finance-report/useReceivedReport'
import ProjectScopeBar from '../components/ProjectScopeBar.vue'
import ReportFilters from './ReportFilters.vue'
import ReportTable from './ReportTable.vue'
import ReportExportActions from '../components/ReportExportActions.vue'
import ReportPdfPreview from '../components/ReportPdfPreview.vue'
import ReportSummary from '../components/ReportSummary.vue'
const { t } = useI18n(),
  state = useReceivedReport()
const { active, summary, loading, exporting, previewOpen, previewUrl, ready, failed, group, closePreview, exportRows } =
  state
const moneyKeys = computed(() =>
  active.value.receivedDateStart || active.value.receivedDateEnd
    ? (['incomeAmount', 'refundAmount', 'netAmount', 'currentPeriodAmount', 'otherPeriodAmount'] as const)
    : (['incomeAmount', 'refundAmount', 'netAmount'] as const)
)
const groups: ReceivedGroup[] = ['DETAIL', 'PROJECT', 'SUBJECT', 'METHOD', 'SOURCE']
</script>
<template>
  <FinancePage>
    <ProjectScopeBar />
    <div class="report-workspace">
      <h2>{{ t('Received.title') }}</h2>
      <p class="report-scope">{{ t('Received.scope') }}</p>
      <ReportFilters :state="state" />
      <a-spin :spinning="loading">
        <ReportSummary
          :label="t('Report.total')"
          :items="
            moneyKeys.map((key) => ({ label: t('Received.' + key), value: summary?.[key], unit: t('Report.currency') }))
          "
        />
      </a-spin>
      <div class="report-toolbar">
        <a-radio-group
          :value="active.groupBy"
          :disabled="exporting"
          :aria-label="t('Report.view')"
          @change="group($event.target.value)"
        >
          <a-radio-button
            v-for="key in groups"
            :key="key"
            :value="key"
          >
            {{ t('Received.' + key) }}
          </a-radio-button>
        </a-radio-group>
        <ReportExportActions
          permission="charging/FinanceReceivedReport:export"
          :state="{ ready, loading, failed, exporting }"
          @export="exportRows"
          @refresh="state.reload"
        />
      </div>
      <a-spin :spinning="exporting"><ReportTable :state="state" /></a-spin>
    </div>
    <ReportPdfPreview
      :state="{ open: previewOpen, url: previewUrl, title: t('Received.printTitle'), filename: t('Received.title') }"
      @close="closePreview"
    />
  </FinancePage>
</template>
<style scoped>
.report-workspace {
  padding: 20px 24px;
  min-width: 0;
  background: var(--ant-color-bg-container, #fff);
}
h2 {
  margin: 0 0 6px;
  font-size: 18px;
  font-weight: 600;
}
.report-scope {
  margin: 0 0 20px;
  color: var(--ant-color-text-secondary, #595959);
  line-height: 1.6;
}
.report-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}

@media (max-width: 560px) {
  .report-workspace {
    padding: 16px 12px;
  }
}
</style>
