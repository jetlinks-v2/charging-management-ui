<script setup lang="ts">
import FinancePage from '../components/FinancePage.vue'
import { useI18n } from 'vue-i18n'
import type { InvoiceGroup } from '../../../api/financeInvoiceReport'
import { useInvoiceReport } from '../../../hooks/finance-report/useInvoiceReport'
import ProjectScopeBar from '../components/ProjectScopeBar.vue'
import ReportFilters from './ReportFilters.vue'
import ReportTable from './ReportTable.vue'
import ReportExportActions from '../components/ReportExportActions.vue'
import ReportPdfPreview from '../components/ReportPdfPreview.vue'
import ReportSummary from '../components/ReportSummary.vue'
const { t } = useI18n(),
  state = useInvoiceReport()
const { active, summary, loading, exporting, previewOpen, previewUrl, ready, failed, group, closePreview, exportRows } =
  state
const moneyKeys = ['receivableAmount', 'receivedAmount', 'invoicedAmount', 'uninvoicedAmount'] as const
const groups: InvoiceGroup[] = ['DETAIL', 'PROJECT', 'SUBJECT']
</script>
<template>
  <FinancePage>
    <ProjectScopeBar />
    <div class="report-workspace">
      <h2>{{ t('InvoiceReport.title') }}</h2>
      <p class="report-scope">{{ t('InvoiceReport.scope') }}</p>
      <ReportFilters :state="state" />
      <a-spin :spinning="loading">
        <ReportSummary
          :label="t('Report.total')"
          :items="
            moneyKeys.map((key) => ({
              label: t('InvoiceReport.' + key),
              value: summary?.[key],
              unit: t('Report.currency')
            }))
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
            {{ t('InvoiceReport.' + key) }}
          </a-radio-button>
        </a-radio-group>
        <ReportExportActions
          permission="charging/FinanceInvoiceReport:export"
          :state="{ ready, loading, failed, exporting }"
          @export="exportRows"
          @refresh="state.reload"
        />
      </div>
      <a-spin :spinning="exporting"><ReportTable :state="state" /></a-spin>
    </div>
    <ReportPdfPreview
      :state="{
        open: previewOpen,
        url: previewUrl,
        title: t('InvoiceReport.printTitle'),
        filename: t('InvoiceReport.title')
      }"
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
