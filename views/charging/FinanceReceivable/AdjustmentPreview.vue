<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { AdjustmentPreview, Receivable } from '../../../api/financeReceivable'
const props = defineProps<{ preview: AdjustmentPreview }>()
const { t } = useI18n()
const fields: (keyof Receivable)[] = [
  'accruedReceivableAmount',
  'adjustmentAmount',
  'assessmentAmount',
  'temporaryDispatchAmount',
  'feeReductionAmount',
  'finalLateFeeAmount',
  'actualReceivableAmount',
  'arrears'
]
const referenceDiffers = computed(() => props.preview.businessDate !== props.preview.calculationAsOfDate)
</script>
<template>
  <SectionCard
    icon="AuditOutlined"
    :title="t('Adjustment.confirmTitle')"
  >
    <div class="adjustment-amount-band">
      <div>
        <span>{{ t('Adjustment.todayBefore') }}</span>
        <strong>{{ preview.effectiveBefore.actualReceivableAmount }}</strong>
      </div>
      <AIcon type="ArrowRightOutlined" />
      <div>
        <span>{{ t('Adjustment.todayAfter') }}</span>
        <strong>{{ preview.effectiveAfter.actualReceivableAmount }}</strong>
      </div>
    </div>
    <p class="adjustment-note">{{ t('Adjustment.confirmHint', { date: preview.businessDate }) }}</p>
    <div
      class="adjustment-comparison"
      role="table"
      :aria-label="t('Adjustment.comparison')"
    >
      <div
        class="adjustment-comparison-row"
        role="row"
      >
        <span role="columnheader">{{ t('Receivable.composition') }}</span>
        <span role="columnheader">{{ t('Adjustment.before') }}</span>
        <span role="columnheader">{{ t('Adjustment.after') }}</span>
      </div>
      <div
        v-for="field in fields"
        :key="field"
        class="adjustment-comparison-row"
        role="row"
      >
        <span role="cell">{{ t('Receivable.' + field) }}</span>
        <span role="cell">{{ preview.effectiveBefore[field] }}</span>
        <strong role="cell">{{ preview.effectiveAfter[field] }}</strong>
      </div>
    </div>
    <a-collapse
      v-if="preview.formula || referenceDiffers"
      ghost
    >
      <a-collapse-panel
        v-if="preview.formula"
        key="formula"
        :header="t('Adjustment.formulaResult')"
      >
        <KvGrid
          :items="[
            { label: t('Adjustment.before'), value: preview.formula.beforeAmount },
            { label: t('Adjustment.after'), value: preview.formula.afterAmount },
            { label: t('Adjustment.delta'), value: preview.delta }
          ]"
        />
      </a-collapse-panel>
      <a-collapse-panel
        v-if="referenceDiffers"
        key="reference"
        :header="t('Adjustment.reference', { date: preview.calculationAsOfDate })"
      >
        <KvGrid
          :items="[
            { label: t('Adjustment.before'), value: preview.referenceBefore.actualReceivableAmount },
            { label: t('Adjustment.after'), value: preview.referenceAfter.actualReceivableAmount }
          ]"
        />
      </a-collapse-panel>
    </a-collapse>
  </SectionCard>
</template>
