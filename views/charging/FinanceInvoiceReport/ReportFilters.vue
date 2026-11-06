<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { onlyMessage } from '@jetlinks-web/utils'
import ConditionFilter, { type ConditionFilterChangePayload } from '@jetlinks-web-core/components/ConditionFilter'
import { reportConditions, type ReportDateRanges } from '../../../hooks/finance-report/reportConditions'
import { useProjectContext } from '../../../hooks/project/useProjectContext'
import type { useInvoiceReport } from '../../../hooks/finance-report/useInvoiceReport'
const props = defineProps<{ state: ReturnType<typeof useInvoiceReport> }>()
const { t } = useI18n()
const { draft, exporting } = props.state
const context = useProjectContext()
const dateRanges: ReportDateRanges = {
  invoiceDate: ['invoiceDateStart', 'invoiceDateEnd']
}
// 主筛选回显来自草稿；返回汇总或重置后不保留隐藏的旧条件。
const terms = computed(() =>
  fields.value.flatMap((field) => {
    const key = field.dataIndex
    const values = draft as unknown as Record<string, unknown>
    const range = dateRanges[key]
    const value = range
      ? range.every((name) => values[name])
        ? range.map((name) => values[name])
        : undefined
      : (draft as unknown as Record<string, unknown>)[key]
    return value == null || value === ''
      ? []
      : [{ column: key, termType: field.search.defaultTermType, value, type: 'and' }]
  })
)
const fields = computed(() =>
  [
    ...Object.keys(dateRanges).map((key) => ({
      title: t(draft.ledger ? 'ReportUI.invoiceDate' : 'InvoiceReport.invoiceDate'),
      dataIndex: key,
      search: {
        type: 'date',
        termOptions: ['btw'],
        defaultTermType: 'btw',
        componentProps: { format: 'YYYY-MM-DD', showTime: false }
      }
    })),

    ...(draft.ledger
      ? [
          {
            title: t('ReportUI.buyerTitle'),
            dataIndex: 'buyerName',
            search: { type: 'string', termOptions: ['like'], defaultTermType: 'like' }
          },
          ...(['ticketColor', 'ticketStatus'] as const).map((key) => ({
            title: t('InvoiceReport.' + (key === 'ticketStatus' ? 'status' : key)),
            dataIndex: key,
            search: {
              type: 'select',
              termOptions: ['eq'],
              defaultTermType: 'eq',
              options: (key === 'ticketColor'
                ? ['BLUE', 'RED']
                : ['SIMULATED_ISSUED', 'SIMULATED_REVERSED', 'SIMULATED_RED']
              ).map((value) => ({ value, label: t('InvoiceReport.' + value) }))
            }
          }))
        ]
      : []),
    {
      title: t('InvoiceReport.customerName'),
      dataIndex: 'customerName',
      search: { type: 'string', termOptions: ['like'], defaultTermType: 'like' }
    },
    {
      title: t('InvoiceReport.fullName'),
      dataIndex: 'fullName',
      search: { type: 'string', termOptions: ['like'], defaultTermType: 'like' }
    },
    {
      title: t(draft.ledger ? 'ReportUI.invoiceNo' : 'InvoiceReport.invoiceNo'),
      dataIndex: 'invoiceNo',
      search: { type: 'string', termOptions: ['like'], defaultTermType: 'like' }
    },
    {
      title: t('InvoiceReport.sourceType'),
      dataIndex: 'sourceType',
      search: {
        type: 'select',
        termOptions: ['eq'],
        defaultTermType: 'eq',
        options: ['RECEIVABLE', 'TEMP_PAYMENT', 'FUND_TOPUP'].map((value) => ({
          value,
          label: t('InvoiceReport.' + value)
        }))
      }
    },
    {
      title: t('InvoiceReport.invoiceStatus'),
      dataIndex: 'invoiceStatus',
      search: {
        type: 'select',
        termOptions: ['eq'],
        defaultTermType: 'eq',
        options: ['UNISSUED', 'PARTIAL', 'INVOICED', 'REVERSED'].map((value) => ({
          value,
          label: t('InvoiceReport.' + value)
        }))
      }
    },
    {
      title: t(draft.ledger ? 'ReportUI.invoiceType' : 'InvoiceReport.invoiceType'),
      dataIndex: 'invoiceType',
      search: {
        type: 'select',
        termOptions: ['eq'],
        defaultTermType: 'eq',
        options: ['1', '2'].map((value) => ({ value, label: t('InvoiceReport.' + value) }))
      }
    }
  ].filter((field) => !draft.ledger || field.dataIndex !== 'invoiceStatus')
)
function change({ filter }: ConditionFilterChangePayload) {
  if (exporting.value) return
  try {
    Object.assign(
      draft,
      reportConditions(
        filter.terms,
        {
          customerName: 'like',
          fullName: 'like',
          buyerName: 'like',
          ticketColor: 'eq',
          ticketStatus: 'eq',
          invoiceNo: 'like',
          sourceType: 'eq',
          invoiceStatus: 'eq',
          invoiceType: 'eq'
        },
        dateRanges
      )
    )
    props.state.apply()
  } catch {
    onlyMessage(t('Report.unsupportedCondition'), 'warning')
  }
}
</script>
<template>
  <div class="report-filters">
    <div class="report-search-row">
      <div
        class="report-search"
        :class="{ 'report-frozen': exporting }"
      >
        <ConditionFilter
          :model-value="terms"
          :fields="fields"
          :disabled="exporting"
          @change="change"
        />
      </div>
      <div class="report-actions"><slot name="actions" /></div>
    </div>
    <a-space
      wrap
      class="report-drill-tags"
    >
      <a-tag
        v-if="state.active.value.projectIds.length !== context.reportProjectIds.value.length"
        closable
        @close.prevent="state.clearProjects"
      >
        {{ t('Report.drilledProjects') }}：{{
          state.active.value.projectIds
            .map((id) => state.projects.value.find((project) => project.id === id)?.name || id)
            .join('、')
        }}
      </a-tag>
      <a-tag
        v-if="draft.subjectIds.length || draft.subjectGroups?.length"
        closable
        @close.prevent="state.clearSubjects"
      >
        {{ t('Report.subjectName') }}：{{ state.subjectLabel.value }}
      </a-tag>
    </a-space>
  </div>
</template>
<style scoped>
.report-filters {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.report-frozen {
  pointer-events: none;
  opacity: 0.65;
}

.report-drill-tags:empty {
  display: none;
}
</style>
