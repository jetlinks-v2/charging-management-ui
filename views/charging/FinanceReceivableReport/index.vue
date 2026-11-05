<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { ReportGroup } from '../../../api/financeReport'
import { useReceivableReport } from '../../../hooks/finance-report/useReceivableReport'
import ProjectScopeBar from '../components/ProjectScopeBar.vue'
import ReportFilters from './ReportFilters.vue'
import ReportTable from './ReportTable.vue'
import ReportExportActions from '../components/ReportExportActions.vue'
import ReportPdfPreview from '../components/ReportPdfPreview.vue'
const { t } = useI18n(),
  state = useReceivableReport()
const { active, summary, loading, exporting, previewOpen, previewUrl, ready, failed, group, closePreview, exportRows } =
  state
const moneyKeys = [
  'receivableAmount',
  'remissionAmount',
  'netAmount',
  'receivedAmount',
  'arrearsAmount',
  'collectionRate'
] as const
const groups: ReportGroup[] = ['DETAIL', 'PROJECT', 'SUBJECT']
</script>
<template>
  <j-page-container>
    <ProjectScopeBar />
    <div class="report-workspace">
      <h2>{{ t('Report.title') }}</h2>
      <p class="report-scope">{{ t('Report.scope') }}</p>
      <ReportFilters :state="state" />
      <a-spin :spinning="loading">
        <dl
          class="report-summary"
          :aria-label="t('Report.total')"
        >
          <div
            v-for="key in moneyKeys"
            :key="key"
          >
            <dt>{{ t('Report.' + key) }}</dt>
            <dd>
              {{ summary?.[key] ?? '—' }}
              <small v-if="summary">{{ key === 'collectionRate' ? '%' : t('Report.currency') }}</small>
            </dd>
          </div>
        </dl>
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
            {{ t('Report.' + key) }}
          </a-radio-button>
        </a-radio-group>
        <ReportExportActions
          permission="charging/FinanceReceivableReport:export"
          :state="{ ready, loading, failed, exporting }"
          @export="exportRows"
          @refresh="state.reload"
        />
      </div>
      <a-spin :spinning="exporting"><ReportTable :state="state" /></a-spin>
    </div>
    <ReportPdfPreview
      :state="{ open: previewOpen, url: previewUrl, title: t('Report.printTitle'), filename: t('Report.title') }"
      @close="closePreview"
    />
  </j-page-container>
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
.report-summary {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 20px;
  padding: 18px 0 22px;
  margin: 0 0 18px;
  border-top: 1px solid var(--ant-color-border-secondary, #f0f0f0);
  border-bottom: 1px solid var(--ant-color-border-secondary, #f0f0f0);
}
.report-summary dt {
  color: var(--ant-color-text-secondary, #595959);
  font-size: 13px;
  margin-bottom: 8px;
}
.report-summary dd {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  overflow-wrap: anywhere;
}
.report-summary small {
  font-size: 12px;
  font-weight: 400;
  margin-left: 5px;
}
.report-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}

@media (max-width: 1100px) {
  .report-summary {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
@media (max-width: 560px) {
  .report-workspace {
    padding: 16px 12px;
  }
  .report-summary {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .report-summary dd {
    font-size: 18px;
  }
}
</style>
