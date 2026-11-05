<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { PrepayQuote } from '../../../../api/financePrepay'
import { sumMoney } from '../../../../utils/receivableTotals'
const props = defineProps<{ quote: PrepayQuote; companyName: string }>()
const { t } = useI18n()
const discount = computed(() => sumMoney(props.quote.lines.map((line) => line.discountAmount)))
const columns = computed(() => [
  { title: t('Prepay.period'), key: 'period', width: 240 },
  { title: t('Prepay.original'), dataIndex: 'originalAmount', align: 'right' as const, width: 120 },
  { title: t('Prepay.discount'), dataIndex: 'discountAmount', align: 'right' as const, width: 120 },
  { title: t('Prepay.pay'), dataIndex: 'paidAmount', align: 'right' as const, width: 120 }
])
</script>
<template>
  <SectionCard
    icon="UnorderedListOutlined"
    :title="t('Prepay.quote')"
  >
    <KvGrid
      :cols="2"
      :items="[
        { label: t('Cashier.selectedPayer'), value: quote.payerName },
        { label: t('Cashier.company'), value: companyName },
        { label: t('Prepay.original'), value: quote.originalAmount },
        { label: t('Prepay.discount'), value: discount }
      ]"
    />
    <a-table
      class="prepay-periods"
      size="small"
      :columns="columns"
      :data-source="quote.lines"
      :row-key="(line) => `${line.type}:${line.start}:${line.end}`"
      :scroll="{ x: 600 }"
      :pagination="{ pageSize: 10, showSizeChanger: false, hideOnSinglePage: true }"
    >
      <template #bodyCell="{ column, record, text }">
        <span v-if="column.key === 'period'">{{ record.start }} ～ {{ record.end }}</span>
        <span
          v-else
          class="cashier-money"
        >
          {{ text }}
        </span>
      </template>
    </a-table>
    <div class="cashier-inline-total">
      {{ t('Prepay.pay') }}
      <strong>{{ quote.payAmount }}</strong>
    </div>
  </SectionCard>
</template>
<style scoped>
.prepay-periods {
  margin-top: 20px;
}
</style>
