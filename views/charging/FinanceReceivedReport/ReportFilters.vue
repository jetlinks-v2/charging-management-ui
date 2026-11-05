<script setup lang="ts">
import { computed } from 'vue'
import dayjs, { type Dayjs } from 'dayjs'
import { useI18n } from 'vue-i18n'
import type { useReceivedReport } from '../../../hooks/finance-report/useReceivedReport'
const props = defineProps<{ state: ReturnType<typeof useReceivedReport> }>()
const { t } = useI18n()
const { draft, projects, exporting, subjectLabel } = props.state
const dates = computed<[Dayjs, Dayjs] | undefined>({
  get: (): [Dayjs, Dayjs] | undefined =>
    draft.receivedDateStart && draft.receivedDateEnd
      ? [dayjs(draft.receivedDateStart), dayjs(draft.receivedDateEnd)]
      : undefined,
  set: (value: [Dayjs, Dayjs] | undefined) => {
    draft.receivedDateStart = value?.[0]?.format('YYYY-MM-DD')
    draft.receivedDateEnd = value?.[1]?.format('YYYY-MM-DD')
  }
})
</script>
<template>
  <a-form
    class="report-filters"
    layout="vertical"
    :model="draft"
    :disabled="exporting"
    @finish="state.apply"
  >
    <a-form-item
      :label="t('Report.projects')"
      class="report-projects"
    >
      <a-select
        v-model:value="draft.projectIds"
        mode="multiple"
        :options="projects.map((p) => ({ value: p.id, label: p.name }))"
        :max-tag-count="2"
        :aria-label="t('Report.projects')"
        show-search
        option-filter-prop="label"
      />
    </a-form-item>
    <a-form-item
      :label="t('Received.receivedDate')"
      class="report-dates"
    >
      <a-range-picker
        v-model:value="dates"
        :aria-label="t('Received.receivedDate')"
        :placeholder="[t('Report.startDate'), t('Report.endDate')]"
      />
    </a-form-item>
    <a-form-item
      v-for="key in ['customerName', 'fullName', 'paymentNo', 'collectorName'] as const"
      :key="key"
      :label="t('Received.' + key)"
    >
      <a-input
        v-model:value="draft[key]"
        :aria-label="t('Received.' + key)"
        :maxlength="200"
        allow-clear
      />
    </a-form-item>
    <a-form-item :label="t('Received.sourceType')">
      <a-select
        v-model:value="draft.sourceTypes"
        mode="multiple"
        :aria-label="t('Received.sourceType')"
        :options="
          ['RECEIVABLE', 'TEMPORARY', 'REFUND', 'ADVANCE', 'DEPOSIT'].map((value) => ({
            value,
            label: t('Received.' + value)
          }))
        "
        allow-clear
      />
    </a-form-item>
    <a-form-item class="report-filter-actions">
      <a-space>
        <a-button
          type="primary"
          html-type="submit"
        >
          {{ t('Report.query') }}
        </a-button>
        <a-button @click="state.reset">{{ t('Report.reset') }}</a-button>
      </a-space>
    </a-form-item>
    <div
      v-if="draft.paymentMethods.length"
      class="report-subject-filter"
    >
      <a-tag
        closable
        @close.prevent="state.clearMethods"
      >
        {{ t('Received.methodText') }}：{{ state.methodLabel.value }}
      </a-tag>
    </div>
    <div
      v-if="draft.subjectIds.length"
      class="report-subject-filter"
    >
      <a-tag
        closable
        @close.prevent="state.clearSubjects"
      >
        {{ t('Report.subjectName') }}：{{ subjectLabel }}
      </a-tag>
    </div>
  </a-form>
</template>
<style scoped>
.report-filters {
  display: grid;
  grid-template-columns: repeat(3, minmax(180px, 1fr));
  gap: 0 16px;
  align-items: end;
}
.report-filters :deep(.ant-form-item) {
  margin-bottom: 14px;
}
.report-filters :deep(.ant-picker) {
  width: 100%;
}
.report-filter-actions {
  align-self: end;
}
.report-subject-filter {
  grid-column: 1/-1;
}
@media (min-width: 1500px) {
  .report-filters {
    grid-template-columns: repeat(4, minmax(180px, 1fr));
  }
}
@media (max-width: 900px) {
  .report-filters {
    grid-template-columns: repeat(2, minmax(160px, 1fr));
  }
}
@media (max-width: 560px) {
  .report-filters {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
