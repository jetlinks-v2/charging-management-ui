<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useReceivableFilters } from '../../../hooks/finance-receivable/useReceivableFilters'
import type { useReceivableWorkspace } from '../../../hooks/finance-receivable/useReceivableWorkspace'
const props = defineProps<{ state: ReturnType<typeof useReceivableWorkspace> }>()
const { t } = useI18n()
const { model, search, reset } = useReceivableFilters(props.state.terms, props.state.archive.projectId)
</script>
<template>
  <a-form
    class="receivable-filters"
    layout="vertical"
    @finish="search"
  >
    <a-form-item
      v-for="key in ['contractCode', 'fullName', 'customerName', 'subjectName'] as const"
      :key="key"
    >
      <a-input
        v-model:value="model[key]"
        :placeholder="t('ReceivableLedger.' + key)"
        :aria-label="t('ReceivableLedger.' + key)"
        allow-clear
      />
    </a-form-item>
    <a-form-item>
      <a-select
        v-model:value="model.periodStatus"
        allow-clear
        :placeholder="t('ReceivableLedger.periodStatus')"
        :aria-label="t('ReceivableLedger.periodStatus')"
        :options="['OPEN', 'CLOSED'].map((value) => ({ value, label: t('ReceivableLedger.status.' + value) }))"
      />
    </a-form-item>
    <a-form-item>
      <a-select
        v-model:value="model.payStatus"
        allow-clear
        :placeholder="t('ReceivableLedger.payStatus')"
        :aria-label="t('ReceivableLedger.payStatus')"
        :options="
          ['UNPAID', 'PARTIAL', 'PAID'].map((value) => ({ value, label: t('ReceivableLedger.status.' + value) }))
        "
      />
    </a-form-item>
    <a-form-item
      v-for="key in ['calcStartDate', 'calcEndDate'] as const"
      :key="key"
    >
      <a-date-picker
        v-model:value="model[key]"
        value-format="YYYY-MM-DD"
        :placeholder="t('ReceivableLedger.' + key)"
        :aria-label="t('ReceivableLedger.' + key)"
      />
    </a-form-item>
    <div class="receivable-filter-actions">
      <a-button
        type="primary"
        html-type="submit"
        :disabled="!state.archive.projectId.value"
      >
        <AIcon type="SearchOutlined" />
        {{ t('ReceivableLedger.search') }}
      </a-button>
      <a-button @click="reset">{{ t('ReceivableLedger.reset') }}</a-button>
    </div>
  </a-form>
</template>
<style scoped>
.receivable-filters {
  display: grid;
  grid-template-columns: repeat(5, minmax(130px, 1fr));
  gap: 12px;
  margin-bottom: 20px;
}
.receivable-filters :deep(.ant-form-item) {
  margin: 0;
}
.receivable-filters :deep(.ant-picker) {
  width: 100%;
}
.receivable-filter-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}
@media (max-width: 1500px) {
  .receivable-filters {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
@media (max-width: 1200px) {
  .receivable-filters {
    grid-template-columns: repeat(2, minmax(140px, 1fr));
  }
}
@media (max-width: 600px) {
  .receivable-filters {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
