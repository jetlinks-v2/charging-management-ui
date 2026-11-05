<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { onlyMessage } from '@jetlinks-web/utils'
import ConditionFilter, { type ConditionFilterChangePayload } from '@jetlinks-web-core/components/ConditionFilter'
import { reportConditions } from '../../../hooks/finance-report/reportConditions'
import { useProjectContext } from '../../../hooks/project/useProjectContext'
import type { useReceivableReport } from '../../../hooks/finance-report/useReceivableReport'
const props = defineProps<{ state: ReturnType<typeof useReceivableReport> }>()
const { t } = useI18n()
const { draft, exporting } = props.state
const filterKey = ref(0),
  context = useProjectContext()
const key = computed(() => context.reportProjectIds.value.join(',') + ':' + filterKey.value)
const fields = computed(() => [
  {
    title: t('Report.customerName'),
    dataIndex: 'customerName',
    search: { type: 'string', termOptions: ['like'], defaultTermType: 'like' }
  },
  {
    title: t('Report.fullName'),
    dataIndex: 'fullName',
    search: { type: 'string', termOptions: ['like'], defaultTermType: 'like' }
  },
  {
    title: t('Report.receivableNo'),
    dataIndex: 'receivableNo',
    search: { type: 'string', termOptions: ['like'], defaultTermType: 'like' }
  },
  {
    title: t('Report.collectionStatus'),
    dataIndex: 'collectionStatus',
    search: {
      type: 'select',
      termOptions: ['eq'],
      defaultTermType: 'eq',
      options: ['UNPAID', 'PARTIAL', 'PAID'].map((value) => ({ value, label: t('Report.' + value) }))
    }
  }
])
function change({ filter }: ConditionFilterChangePayload) {
  if (exporting.value) return
  try {
    Object.assign(
      draft,
      reportConditions(filter.terms, {
        customerName: 'like',
        fullName: 'like',
        receivableNo: 'like',
        collectionStatus: 'eq'
      })
    )
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
      <a-form-item :label="t('Report.receivableDate') + ' · ' + t('Report.startDate')">
        <a-date-picker
          v-model:value="draft.receivableDateStart"
          value-format="YYYY-MM-DD"
          :disabled="exporting"
          allow-clear
        />
      </a-form-item>
      <a-form-item :label="t('Report.receivableDate') + ' · ' + t('Report.endDate')">
        <a-date-picker
          v-model:value="draft.receivableDateEnd"
          value-format="YYYY-MM-DD"
          :disabled="exporting"
          allow-clear
        />
      </a-form-item>
      <a-form-item :label="t('Report.dueDate') + ' · ' + t('Report.startDate')">
        <a-date-picker
          v-model:value="draft.dueDateStart"
          value-format="YYYY-MM-DD"
          :disabled="exporting"
          allow-clear
        />
      </a-form-item>
      <a-form-item :label="t('Report.dueDate') + ' · ' + t('Report.endDate')">
        <a-date-picker
          v-model:value="draft.dueDateEnd"
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
