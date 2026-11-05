<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { onlyMessage } from '@jetlinks-web/utils'
import ConditionFilter, { type ConditionFilterChangePayload } from '@jetlinks-web-core/components/ConditionFilter'
import { reportConditions } from '../../../hooks/finance-report/reportConditions'
import { useProjectContext } from '../../../hooks/project/useProjectContext'
import { queryReceivedReport, type ReceivedSource } from '../../../api/financeReceivedReport'
import { requestErrorMessage } from '../../../utils/requestError'
import type { useReceivedReport } from '../../../hooks/finance-report/useReceivedReport'
const props = defineProps<{ state: ReturnType<typeof useReceivedReport> }>()
const { t } = useI18n()
const { draft, exporting } = props.state
const filterKey = ref(0),
  context = useProjectContext()
const key = computed(() => context.reportProjectIds.value.join(',') + ':' + filterKey.value)
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
    const { method, source, ...values } = reportConditions(filter.terms, {
      customerName: 'like',
      fullName: 'like',
      paymentNo: 'like',
      collectorName: 'like',
      method: 'eq',
      source: 'eq'
    })
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
function reset() {
  if (exporting.value) return
  props.state.reset()
  filterKey.value++
}
</script>
<template>
  <div class="report-filters">
    <div :class="{ 'report-frozen': exporting }">
      <ConditionFilter
        :key="key"
        :fields="fields"
        :disabled="exporting"
        @change="change"
      />
    </div>
    <a-form
      layout="inline"
      :model="draft"
      class="report-dates"
      @finish="state.apply"
    >
      <a-form-item :label="t('Received.receivedDate') + ' · ' + t('Report.startDate')">
        <a-date-picker
          v-model:value="draft.receivedDateStart"
          value-format="YYYY-MM-DD"
          :disabled="exporting"
          allow-clear
        />
      </a-form-item>
      <a-form-item :label="t('Received.receivedDate') + ' · ' + t('Report.endDate')">
        <a-date-picker
          v-model:value="draft.receivedDateEnd"
          value-format="YYYY-MM-DD"
          :disabled="exporting"
          allow-clear
        />
      </a-form-item>
      <a-form-item>
        <a-space>
          <a-button
            type="primary"
            html-type="submit"
            :disabled="exporting"
          >
            {{ t('Report.query') }}
          </a-button>
          <a-button
            :disabled="exporting"
            @click="reset"
          >
            {{ t('Report.reset') }}
          </a-button>
        </a-space>
      </a-form-item>
    </a-form>
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
  margin-bottom: 16px;
}
.report-frozen {
  pointer-events: none;
  opacity: 0.65;
}
.report-dates {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 0;
  margin-top: 8px;
}
.report-dates :deep(.ant-form-item) {
  margin-bottom: 0;
}
.report-dates :deep(.ant-picker) {
  width: 150px;
}
.report-drill-tags:not(:empty) {
  margin-top: 10px;
}
</style>
