<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import ConditionFilter, { type ConditionFilterChangePayload } from '@jetlinks-web-core/components/ConditionFilter'
import { onlyMessage } from '@jetlinks-web/utils'
import { reportConditions, type ReportDateRanges } from '../../../../hooks/finance-report/reportConditions'
import type { useAnalysisReport } from '../../../../hooks/finance-report/useAnalysisReport'
const props = defineProps<{ state: ReturnType<typeof useAnalysisReport> }>(),
  { t } = useI18n()
const dates = computed((): ReportDateRanges => {
  const value: ReportDateRanges = {}
  if (props.state.kind !== 'arrears') value.businessDate = ['startDate', 'endDate']
  return value
})
const textKeys = computed(() => [
  'customerName',
  'fullName',
  'subjectName',
  'billNo',
  ...(props.state.kind === 'activity' ? ['activityName'] : [])
])
const optionKeys = computed(
  (): Record<string, string[]> =>
    props.state.kind === 'funds'
      ? { type: ['ADVANCE', 'DEPOSIT'] }
      : props.state.kind === 'arrears'
        ? { ageBucket: ['NOT_DUE', 'DAYS_30', 'DAYS_90', 'DAYS_180', 'DAYS_365', 'OVER_365', 'UNDATED'] }
        : props.state.kind === 'changes'
          ? {
              operation: [
                'ADJUST',
                'SPLIT',
                'REFUND',
                'COLLECT',
                'PREPAY_COLLECT',
                'OFFSET',
                'RETURN_OFFSET',
                'REDUCE',
                'REDUCE_LATE_FEE'
              ]
            }
          : {}
)
const fields = computed(() => [
  ...(props.state.kind === 'arrears'
    ? [
        {
          title: t('Analysis.cutoffDate'),
          dataIndex: 'endDate',
          search: {
            type: 'date',
            termOptions: ['eq'],
            defaultTermType: 'eq',
            componentProps: { format: 'YYYY-MM-DD', showTime: false }
          }
        }
      ]
    : [
        {
          title: t('Analysis.businessDate'),
          dataIndex: 'businessDate',
          search: {
            type: 'date',
            termOptions: ['btw'],
            defaultTermType: 'btw',
            componentProps: { format: 'YYYY-MM-DD', showTime: false }
          }
        }
      ]),
  ...textKeys.value.map((key) => ({
    title: t('Analysis.columns.' + key),
    dataIndex: key,
    search: { type: 'string', termOptions: ['like'], defaultTermType: 'like' }
  })),
  ...Object.entries(optionKeys.value).map(([key, values]) => ({
    title: t('Analysis.columns.' + key),
    dataIndex: key,
    search: {
      type: 'select',
      termOptions: ['eq'],
      defaultTermType: 'eq',
      options: values?.map((value) => ({ value, label: t('Analysis.enums.' + value) }))
    }
  }))
])
const terms = computed(() =>
  fields.value.flatMap((field) => {
    const key = field.dataIndex
    const i = props.state.active.value as unknown as Record<string, unknown>
    const value = key === 'businessDate' ? [i.startDate, i.endDate] : i[key]
    return value == null || value === ''
      ? []
      : [{ column: key, termType: field.search.defaultTermType, value, type: 'and' }]
  })
)
function change({ filter }: ConditionFilterChangePayload) {
  try {
    const allowed = Object.fromEntries([
      ...textKeys.value.map((k) => [k, 'like']),
      ...Object.keys(optionKeys.value).map((k) => [k, 'eq'])
    ]) as Record<string, 'like' | 'eq'>
    if (props.state.kind === 'arrears') {
      const date = filter.terms.find((term) => term.column === 'endDate')
      if (!date || date.termType !== 'eq' || date.type === 'or') throw new Error('date required')
      const values = reportConditions(
        filter.terms.filter((term) => term !== date),
        allowed
      )
      props.state.apply({
        ...values,
        endDate: typeof date.value === 'number' ? new Date(date.value).toLocaleDateString('sv-SE') : String(date.value)
      })
    } else props.state.apply(reportConditions(filter.terms, allowed, dates.value))
  } catch {
    onlyMessage(t('ReportUI.unsupportedConditions'), 'warning')
  }
}
</script>
<template>
  <div class="report-search-row">
    <ConditionFilter
      class="report-search"
      :fields="fields"
      :model-value="terms"
      :disabled="state.exporting.value"
      @change="change"
    />
    <div class="report-actions"><slot /></div>
  </div>
</template>
