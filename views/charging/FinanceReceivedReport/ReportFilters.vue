<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { onlyMessage } from '@jetlinks-web/utils'
import ConditionFilter, { type ConditionFilterChangePayload } from '@jetlinks-web-core/components/ConditionFilter'
import { reportConditions, type ReportDateRanges } from '../../../hooks/finance-report/reportConditions'
import { useProjectContext } from '../../../hooks/project/useProjectContext'
import { queryReceivedReport, type ReceivedSource } from '../../../api/financeReceivedReport'
import { requestErrorMessage } from '../../../utils/requestError'
import type { useReceivedReport } from '../../../hooks/finance-report/useReceivedReport'
const props = defineProps<{ state: ReturnType<typeof useReceivedReport> }>()
const { t } = useI18n()
const { draft, exporting } = props.state
const context = useProjectContext()
const dateRanges: ReportDateRanges = {
  feeDate: ['calcStartDate', 'calcEndDate'],
  receivedDate: ['receivedDateStart', 'receivedDateEnd']
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
      : key === 'method'
      ? draft.paymentMethods?.[0]
      : key === 'source'
      ? draft.sourceTypes?.[0]
      : (draft as unknown as Record<string, unknown>)[key]
    return value == null || value === ''
      ? []
      : [{ column: key, termType: field.search.defaultTermType, value, type: 'and' }]
  })
)
async function paymentMethods() {
  try {
    const result = await queryReceivedReport({
      projectIds: [...context.reportProjectIds.value],
      spaceIds: [],
      subjectIds: [],
      paymentMethods: [],
      sourceTypes: [],
      groupBy: 'METHOD',
      pageIndex: 0,
      pageSize: 200
    })
    if (result.page.total > 200) {
      onlyMessage(t('Report.methodLimit'), 'warning')
      return []
    }
    const methods = new Map<string, Set<string>>()
    for (const row of result.page.data)
      if (row.method) {
        if (!methods.has(row.method)) methods.set(row.method, new Set())
        if (row.methodText) methods.get(row.method)!.add(row.methodText)
      }
    return [...methods].map(([value, labels]) => ({ value, label: [...labels].join('、') || value }))
  } catch (error) {
    onlyMessage(requestErrorMessage(error, t('Finance.failed')), 'error')
    return []
  }
}
const fields = computed(() => [
  ...Object.keys(dateRanges).map((key) => ({
    title: t(key === 'feeDate' ? 'Report.feeDate' : 'Received.receivedDate'),
    dataIndex: key,
    search: {
      type: 'date',
      termOptions: ['btw'],
      defaultTermType: 'btw',
      componentProps: { format: 'YYYY-MM-DD', showTime: false }
    }
  })),

  {
    title: t('Received.handoverState'),
    dataIndex: 'handoverState',
    search: {
      type: 'select',
      termOptions: ['eq'],
      defaultTermType: 'eq',
      options: ['UNHANDED', 'PENDING', 'APPROVED'].map((value) => ({ value, label: t('Received.' + value) }))
    }
  },
  {
    title: t('Received.customerName'),
    dataIndex: 'customerName',
    search: { type: 'string', termOptions: ['like'], defaultTermType: 'like' }
  },
  {
    title: t('Received.fullName'),
    dataIndex: 'fullName',
    search: { type: 'string', termOptions: ['like'], defaultTermType: 'like' }
  },
  {
    title: t('Received.paymentNo'),
    dataIndex: 'paymentNo',
    search: { type: 'string', termOptions: ['like'], defaultTermType: 'like' }
  },
  {
    title: t('Received.collectorName'),
    dataIndex: 'collectorName',
    search: { type: 'string', termOptions: ['like'], defaultTermType: 'like' }
  },
  {
    title: t('Received.methodText'),
    dataIndex: 'method',
    search: {
      type: 'select',
      termOptions: ['eq'],
      defaultTermType: 'eq',
      options: paymentMethods
    }
  },
  {
    title: t('Received.sourceType'),
    dataIndex: 'source',
    search: {
      type: 'select',
      termOptions: ['eq'],
      defaultTermType: 'eq',
      options: [
        'RECEIVABLE',
        'TEMPORARY',
        'REFUND',
        'TEMPORARY_REFUND',
        'ADVANCE',
        'DEPOSIT',
        'ADVANCE_REFUND',
        'DEPOSIT_REFUND'
      ].map((value) => ({ value, label: t('Received.' + value) }))
    }
  }
])
function change({ filter }: ConditionFilterChangePayload) {
  if (exporting.value) return
  try {
    const { method, source, ...values } = reportConditions(
      filter.terms,
      {
        customerName: 'like',
        fullName: 'like',
        paymentNo: 'like',
        collectorName: 'like',
        handoverState: 'eq',
        method: 'eq',
        source: 'eq'
      },
      dateRanges
    )
    // 修改或移除收银员条件时，同时清除下钻带入的精确账号，避免隐藏条件继续限制结果。
    if (values.collectorName !== draft.collectorName) draft.collectorId = undefined
    Object.assign(draft, values)
    draft.methodGroups = []
    draft.paymentMethods = method ? [method] : []
    draft.sourceTypes = source ? [source as ReceivedSource] : []
    props.state.methodLabel.value = ''
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
      <a-tag
        v-if="draft.paymentMethods.length && state.methodLabel.value"
        closable
        @close.prevent="state.clearMethods"
      >
        {{ t('Received.methodText') }}：{{ state.methodLabel.value }}
      </a-tag>
      <a-tag
        v-if="draft.sourceTypes.length"
        closable
        @close.prevent="state.clearSources"
      >
        {{ t('Received.sourceType') }}：{{ draft.sourceTypes.map((type) => t('Received.' + type)).join('、') }}
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
