<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { TaxItem } from '../../../api/financeTax'
const props = defineProps<{ tax?: TaxItem }>()
const emit = defineEmits<{ select: [] }>()
const { t } = useI18n()
const items = computed(() => [
  { label: t('Finance.companyName'), value: props.tax?.companyName || '—' },
  { label: t('Finance.taxNumber'), value: props.tax?.sellerTaxNum || '—' },
  { label: t('FinanceTax.goodsCode'), value: props.tax?.goodsCode || '—' },
  { label: t('FinanceTax.classificationName'), value: props.tax?.classificationName || '—' },
  {
    label: t('FinanceTax.taxRate'),
    value: props.tax?.taxRate == null ? '—' : `${Number((Number(props.tax.taxRate) * 100).toFixed(6))}%`
  },
  {
    label: t('FinanceTax.includingTaxFlag'),
    value:
      props.tax?.includingTaxFlag == null ? '—' : t(props.tax.includingTaxFlag === 1 ? 'Subject.yes' : 'Subject.no')
  }
])
</script>
<template>
  <div class="standard-tax-selection">
    <span :class="{ 'tax-empty': !tax }">{{ tax?.goodsName || t('Standard.noTaxSelected') }}</span>
    <a-button @click="emit('select')">{{ t(tax ? 'Standard.changeTax' : 'Standard.chooseTax') }}</a-button>
  </div>
  <div
    v-if="tax"
    class="standard-tax-summary"
  >
    <KvGrid
      :items="items"
      :cols="3"
      :gap="16"
    />
  </div>
</template>
<style scoped>
.standard-tax-selection {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.standard-tax-selection span {
  overflow-wrap: anywhere;
}
.tax-empty {
  color: var(--ink-3, #737373);
}
.standard-tax-summary {
  margin-top: 16px;
  padding: 16px;
  border: 1px solid var(--line, #f0f0f0);
  border-radius: 6px;
  background: var(--bg-2, #fafafa);
}
@media (max-width: 600px) {
  .standard-tax-summary :deep(.kv-grid) {
    grid-template-columns: 1fr;
  }
}
</style>
