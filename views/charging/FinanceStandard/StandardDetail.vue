<script setup lang="ts">
import { formatFinanceTime } from '../../../utils/financeTime'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { FinanceStandard, StandardOptions } from '../../../api/financeStandard'
import { decodeTieredFormula } from '../../../hooks/finance-standard/tieredFormula'
import StandardTierPricing from './StandardTierPricing.vue'
import { formulaDisplay } from '../../../hooks/finance-standard/formula'
const props = defineProps<{ detail: FinanceStandard; options: StandardOptions }>()
const { t } = useI18n()
const label = (key: string) => t('Standard.' + key)
const tiered = computed(() => decodeTieredFormula(props.detail.formulaExpression, props.detail.price))
const isMeter = computed(() => ['WATER', 'ELECTRICITY', 'GAS'].includes(props.detail.billingMethod))
const meterRows = computed(() => tiered.value?.tiers || [{ upper: null, price: props.detail.price }])
const visibleFormula = computed(() =>
  isMeter.value
    ? formulaDisplay(tiered.value?.formula || props.detail.formulaExpression, props.detail.variablesSnapshot)
    : props.detail.formulaDisplay
)
const enumText = (key: keyof StandardOptions, value: unknown) => {
  const rows = props.options[key] as { value: unknown; text: string }[]
  return rows.find((row) => row.value === value)?.text || String(value ?? '—')
}
const basic = computed(() => [
  { label: label('standardCode'), value: props.detail.standardCode },
  { label: label('subjectId'), value: props.detail.subjectName },
  { label: label('billingMethod'), value: enumText('billingMethods', props.detail.billingMethod) },
  ...(!isMeter.value ? [{ label: label('price'), value: props.detail.price ?? '—' }] : []),
  { label: label('chargeRoundType'), value: enumText('chargeRoundTypes', props.detail.chargeRoundType) },
  { label: label('mantissa'), value: enumText('mantissas', props.detail.mantissa) },
  { label: label('settlementMethod'), value: enumText('settlementMethods', props.detail.settlementMethod) },
  { label: label('effectiveStatus'), value: enumText('effectiveStatuses', props.detail.effectiveStatus) },
  { label: label('executeDate'), value: props.detail.executeDate || t('Standard.unlimitedStart') },
  { label: label('cancelDate'), value: props.detail.cancelDate || t('Standard.unlimitedEnd') }
])
const tax = computed(() => [
  { label: t('FinanceTax.goodsName'), value: props.detail.taxSnapshot?.goodsName || '—' },
  { label: t('Finance.companyName'), value: props.detail.taxSnapshot?.companyName || '—' },
  { label: t('FinanceTax.goodsCode'), value: props.detail.taxSnapshot?.goodsCode || '—' },
  {
    label: t('FinanceTax.taxRate'),
    value:
      props.detail.taxSnapshot?.taxRate == null
        ? '—'
        : Number((Number(props.detail.taxSnapshot.taxRate) * 100).toFixed(6)) + '%'
  }
])
const delay = computed(() =>
  props.detail.isDelay
    ? [
        { label: label('delayCalcForm'), value: enumText('delayCalcForms', props.detail.delayCalcForm) },
        { label: label('rateAmount'), value: props.detail.rateAmount ?? '—' },
        { label: label('delayRoundType'), value: enumText('delayRoundTypes', props.detail.delayRoundType) },
        { label: label('delayBaseType'), value: enumText('delayBaseTypes', props.detail.delayBaseType) }
      ]
    : [{ label: label('isDelay'), value: t('Subject.no') }]
)
</script>
<template>
  <div class="standard-detail">
    <SectionCard
      icon="ProfileOutlined"
      :title="t('Standard.basic')"
    >
      <KvGrid
        :items="basic"
        :gap="18"
      />
    </SectionCard>
    <SectionCard
      icon="FunctionOutlined"
      :title="t('Standard.formulaSection')"
    >
      <StandardTierPricing
        v-if="isMeter"
        :rows="meterRows"
        :unit="detail.billingMethod === 'ELECTRICITY' ? 'kW·h' : 'm³'"
        readonly
      />
      <p class="standard-detail-formula">{{ visibleFormula }}</p>
      <code
        v-if="!isMeter"
        class="standard-expression"
      >
        {{ detail.formulaExpression }}
      </code>
      <div class="standard-variable-tags">
        <a-tag
          v-for="item in detail.variablesSnapshot"
          :key="item.variableCode"
        >
          {{ item.variableName }}
        </a-tag>
      </div>
    </SectionCard>
    <SectionCard
      icon="FileTextOutlined"
      :title="t('Standard.taxSection')"
    >
      <KvGrid
        :items="tax"
        :gap="18"
      />
    </SectionCard>
    <SectionCard
      icon="ClockCircleOutlined"
      :title="t('Standard.delaySection')"
    >
      <KvGrid
        :items="delay"
        :gap="18"
      />
    </SectionCard>
    <SectionCard
      v-if="detail.remark"
      icon="AlignLeftOutlined"
      :title="t('Standard.remark')"
    >
      <p>{{ detail.remark }}</p>
    </SectionCard>
    <div class="finance-audit">
      {{ t('Finance.modified') }}：{{ detail.modifierName || '—' }} ·
      {{ detail.modifyTime ? formatFinanceTime(detail.modifyTime) : '—' }}
    </div>
  </div>
</template>
<style scoped>
.standard-detail-formula {
  font-size: 16px;
  line-height: 1.7;
  margin: 0;
  overflow-wrap: anywhere;
}
.standard-expression {
  color: var(--ink-3, #737373);
  font-size: 12px;
  overflow-wrap: anywhere;
}
.standard-variable-tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-top: 12px;
}
</style>

<style scoped>
@media (max-width: 600px) {
  .standard-detail :deep(.kv-grid) {
    grid-template-columns: 1fr;
  }
}
</style>
