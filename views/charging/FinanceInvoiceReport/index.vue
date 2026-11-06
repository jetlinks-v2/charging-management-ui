<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import FinancePage from '../components/FinancePage.vue'
import ProjectScopeBar from '../components/ProjectScopeBar.vue'
import ReportExportActions from '../components/ReportExportActions.vue'
import ReportPdfPreview from '../components/ReportPdfPreview.vue'
import ReportSummary from '../components/ReportSummary.vue'
import ReportFilters from './ReportFilters.vue'
import ReportTable from './ReportTable.vue'
import { useInvoiceReport } from '../../../hooks/finance-report/useInvoiceReport'
import '../components/report-layout.css'
const { t } = useI18n(),
  state = useInvoiceReport()
const {
  active,
  summary,
  loading,
  exporting,
  ready,
  failed,
  parent,
  previewOpen,
  previewUrl,
  closePreview,
  exportRows
} = state
const moneyKeys = computed(() =>
  active.value.ledger
    ? ['invoicedAmount', 'netAmount', 'taxAmount', 'differenceAmount', 'outputTax']
    : ['receivableAmount', 'receivedAmount', 'invoicedAmount', 'uninvoicedAmount']
)
const groups = ['SUBJECT', 'PROJECT', 'DETAIL', 'TICKET'] as const
const summaryItems = computed(() =>
  moneyKeys.value.map((key) => ({
    label: t('InvoiceReport.' + key),
    value: summary.value?.[key as keyof NonNullable<typeof summary.value>],
    unit: key === 'collectionRate' ? '%' : t('Report.currency')
  }))
)
</script>
<template>
  <FinancePage fixed>
    <ProjectScopeBar multiple />
    <section class="report-workspace">
      <ReportFilters :state="state">
        <template #actions>
          <ReportExportActions
            permission="charging/FinanceInvoiceReport:export"
            :state="{ ready, loading, failed, exporting }"
            :detail-only="active.ledger"
            @export="exportRows"
          />
        </template>
      </ReportFilters>
      <div class="report-toolbar">
        <a-radio-group
          :value="active.ledger ? 'TICKET' : active.groupBy"
          :disabled="exporting"
          :aria-label="t('Report.view')"
          @change="state.view($event.target.value)"
        >
          <a-radio-button
            v-for="key in groups"
            :key="key"
            :value="key"
          >
            {{ t('InvoiceReport.' + key) }}
          </a-radio-button>
        </a-radio-group>
        <a-button
          v-if="parent"
          type="link"
          :disabled="exporting"
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
      <div class="report-data">
        <a-spin :spinning="exporting">
          <ReportTable :state="state" />
        </a-spin>
      </div>
    </section>
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
