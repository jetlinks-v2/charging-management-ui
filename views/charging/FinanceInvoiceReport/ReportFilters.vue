<script setup lang="ts">
import { computed } from 'vue'
import dayjs, { type Dayjs } from 'dayjs'
import { useI18n } from 'vue-i18n'
import type { useInvoiceReport } from '../../../hooks/finance-report/useInvoiceReport'
const props = defineProps<{ state: ReturnType<typeof useInvoiceReport> }>()
const { t } = useI18n()
const { draft, projects, exporting, subjectLabel } = props.state
const dates = computed<[Dayjs, Dayjs] | undefined>({
  get: (): [Dayjs, Dayjs] | undefined =>
    draft.invoiceDateStart && draft.invoiceDateEnd
      ? [dayjs(draft.invoiceDateStart), dayjs(draft.invoiceDateEnd)]
      : undefined,
  set: (value: [Dayjs, Dayjs] | undefined) => {
    draft.invoiceDateStart = value?.[0]?.format('YYYY-MM-DD')
    draft.invoiceDateEnd = value?.[1]?.format('YYYY-MM-DD')
  }
})
const selects = [
  { key: 'sourceType', options: ['RECEIVABLE', 'TEMP_PAYMENT', 'FUND_TOPUP'] },
  { key: 'invoiceStatus', options: ['UNISSUED', 'PARTIAL', 'INVOICED', 'REVERSED'] },
  { key: 'invoiceType', options: ['1', '2'] }
] as const
</script>
<template>
  <a-form
    class="report-filters"
    layout="vertical"
    :model="draft"
    :disabled="exporting"
    @finish="state.apply"
  >
    <a-form-item :label="t('Report.projects')">
      <a-select
        v-model:value="draft.projectIds"
        mode="multiple"
        :max-tag-count="2"
        :options="projects.map((p) => ({ value: p.id, label: p.name }))"
        :aria-label="t('Report.projects')"
        show-search
        option-filter-prop="label"
      />
    </a-form-item>
    <a-form-item :label="t('InvoiceReport.dateFilter')">
      <a-range-picker
        v-model:value="dates"
        :aria-label="t('InvoiceReport.dateFilter')"
        :placeholder="[t('Report.startDate'), t('Report.endDate')]"
      />
    </a-form-item>
    <a-form-item
      v-for="key in ['customerName', 'fullName', 'sourceId', 'invoiceNo'] as const"
      :key="key"
      :label="t('InvoiceReport.' + key)"
    >
      <a-input
        v-model:value="draft[key]"
        :aria-label="t('InvoiceReport.' + key)"
        :maxlength="200"
        allow-clear
      />
    </a-form-item>
    <a-form-item
      v-for="field in selects"
      :key="field.key"
      :label="t('InvoiceReport.' + field.key)"
    >
      <a-select
        v-model:value="draft[field.key]"
        :aria-label="t('InvoiceReport.' + field.key)"
        :placeholder="t('Report.allStates')"
        allow-clear
      >
        <a-select-option
          v-for="key in field.options"
          :key="key"
          :value="key"
        >
          {{ t('InvoiceReport.' + key) }}
        </a-select-option>
      </a-select>
    </a-form-item>
    <a-form-item>
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
