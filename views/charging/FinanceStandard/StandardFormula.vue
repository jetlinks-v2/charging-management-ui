<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { StandardInput, StandardOptions, FormulaVariable } from '../../../api/financeStandard'
import StandardFormulaEditor from './StandardFormulaEditor.vue'
import StandardTierPricing from './StandardTierPricing.vue'
import type { StandardPricing } from '../../../hooks/finance-standard/useStandardPricing'
const props = defineProps<{
  model: StandardInput
  options: StandardOptions
  variables: FormulaVariable[]
  display: string
  projectId: string
  pricing: StandardPricing
}>()
const emit = defineEmits<{ method: [string] }>()
const { t } = useI18n()
const required = (key: string) => [{ required: true, message: t('Finance.required', { field: t('Standard.' + key) }) }]
</script>
<template>
  <a-form-item
    name="billingMethod"
    :label="t('Standard.billingMethod')"
    :rules="required('billingMethod')"
  >
    <a-radio-group
      :value="model.billingMethod"
      button-style="solid"
      @change="
        (event) => {
          model.billingMethod = event.target.value
          emit('method', event.target.value)
        }
      "
    >
      <a-radio-button
        v-for="item in options.billingMethods"
        :key="item.value"
        :value="item.value"
      >
        {{ item.text }}
      </a-radio-button>
    </a-radio-group>
  </a-form-item>
  <div
    v-if="pricing.isMeter"
    class="standard-tier-editor"
  >
    <StandardTierPricing
      v-model:rows="pricing.state.tiers"
      :unit="pricing.unit"
      @remove="pricing.removeTier"
    />
    <a-button
      type="dashed"
      block
      :disabled="pricing.state.tiers.length >= 10"
      @click="pricing.addTier"
    >
      <AIcon type="PlusOutlined" />
      {{ t('Standard.addTier') }}
    </a-button>
  </div>
  <a-form-item
    name="formulaExpression"
    :label="t('Standard.formulaExpression')"
    :rules="required('formulaExpression')"
  >
    <div class="standard-formula-control">
      <a-textarea
        :value="display"
        readonly
        :auto-size="{ minRows: 1, maxRows: 4 }"
        :aria-label="t('Standard.formulaExpression')"
      />
      <StandardFormulaEditor
        :expression="pricing.isMeter ? pricing.state.formula : model.formulaExpression"
        :fixed-expression="pricing.isMeter ? pricing.base : undefined"
        :project-id="projectId"
        :variables="variables"
        :default-expression="
          options.billingMethods.find((row) => row.value === model.billingMethod)?.defaultExpression || ''
        "
        @confirm="pricing.isMeter ? pricing.setFormula($event) : (model.formulaExpression = $event)"
      />
    </div>
  </a-form-item>
  <div
    class="finance-form-grid standard-precision-grid"
    :class="{ 'standard-precision-grid--tiered': pricing.isMeter }"
  >
    <a-form-item
      v-if="!pricing.isMeter"
      name="price"
      :label="t('Standard.price')"
      :rules="required('price')"
    >
      <a-input-number
        :value="model.price ?? undefined"
        @update:value="model.price = $event == null ? null : String($event)"
        string-mode
        :min="'0'"
        :max="'999999999999999999.99'"
        :precision="2"
        class="standard-full"
      />
    </a-form-item>
    <a-form-item
      name="chargeRoundType"
      :label="t('Standard.chargeRoundType')"
      :rules="required('chargeRoundType')"
    >
      <a-select
        v-model:value="model.chargeRoundType"
        :options="props.options.chargeRoundTypes.map((item) => ({ value: item.value, label: item.text }))"
      />
    </a-form-item>
    <a-form-item
      name="mantissa"
      :label="t('Standard.mantissa')"
      :rules="required('mantissa')"
    >
      <a-select
        v-model:value="model.mantissa"
        :options="props.options.mantissas.map((item) => ({ value: item.value, label: item.text }))"
      />
    </a-form-item>
  </div>
  <a-form-item
    name="settlementMethod"
    :label="t('Standard.settlementMethod')"
    :rules="required('settlementMethod')"
  >
    <a-radio-group
      v-model:value="model.settlementMethod"
      :disabled="pricing.isMeter"
      :options="options.settlementMethods.map((row) => ({ value: row.value, label: row.text }))"
    />
  </a-form-item>
</template>
<style scoped>
.standard-full {
  width: 100%;
}
.standard-tier-editor {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 18px;
}
.standard-formula-control {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}
.standard-formula-control :deep(textarea) {
  flex: 1;
}
.standard-precision-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}
.standard-precision-grid--tiered {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}
@media (max-width: 600px) {
  .standard-precision-grid {
    grid-template-columns: 1fr;
  }
}
</style>
