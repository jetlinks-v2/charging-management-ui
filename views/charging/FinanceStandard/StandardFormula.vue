<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { StandardInput, StandardOptions, FormulaVariable } from '../../../api/financeStandard'
import { useFormulaValidation } from '../../../hooks/finance-standard/useFormulaValidation'
const props = defineProps<{
  model: StandardInput
  options: StandardOptions
  variables: FormulaVariable[]
  display: string
  projectId: string
}>()
const emit = defineEmits<{ method: [string] }>()
const { t } = useI18n()
const { checking, valid, check } = useFormulaValidation(
  () => props.projectId,
  () => props.model.formulaExpression,
  () => props.display
)
const methodOptions = computed(() => props.options.billingMethods.map((row) => ({ value: row.value, label: row.text })))
const required = (key: string) => [{ required: true, message: t('Finance.required', { field: t('Standard.' + key) }) }]
function insert(value: string) {
  props.model.formulaExpression += value
}
</script>
<template>
  <div class="finance-form-grid">
    <a-form-item
      name="billingMethod"
      :label="t('Standard.billingMethod')"
      :rules="required('billingMethod')"
    >
      <a-select
        v-model:value="model.billingMethod"
        :options="methodOptions"
        @change="(value) => emit('method', String(value))"
      />
    </a-form-item>
    <a-form-item
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
  </div>
  <a-form-item
    name="formulaExpression"
    :label="t('Standard.formulaExpression')"
    :rules="required('formulaExpression')"
  >
    <div class="standard-formula-tools">
      <a-space
        wrap
        :size="[6, 6]"
      >
        <a-button
          v-for="item in props.options.variables.filter((item) => item.enabled)"
          :key="item.variableCode"
          size="small"
          @click="insert('${' + item.variableCode + '}')"
        >
          {{ item.variableName }}
        </a-button>
        <a-button
          v-for="operator in ['+', '-', '*', '/', '(', ')']"
          :key="operator"
          size="small"
          @click="insert(operator)"
        >
          {{ operator }}
        </a-button>
      </a-space>
    </div>
    <a-textarea
      v-model:value="model.formulaExpression"
      :rows="3"
      :maxlength="2000"
      :placeholder="t('Standard.formulaPlaceholder')"
      class="standard-formula-code"
    />
    <div class="standard-formula-preview">{{ display || t('Standard.formulaEmpty') }}</div>
    <div class="standard-formula-check">
      <span>{{ t('Standard.formulaHint') }}</span>
      <a-button
        size="small"
        :loading="checking"
        :disabled="!model.formulaExpression"
        @click="check"
      >
        <AIcon
          v-if="valid"
          type="CheckCircleOutlined"
        />
        {{ t('Standard.validateFormula') }}
      </a-button>
    </div>
  </a-form-item>
  <div class="finance-form-grid">
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
    <a-form-item
      name="settlementMethod"
      :label="t('Standard.settlementMethod')"
      :rules="required('settlementMethod')"
    >
      <a-select
        v-model:value="model.settlementMethod"
        :options="props.options.settlementMethods.map((item) => ({ value: item.value, label: item.text }))"
      />
    </a-form-item>
  </div>
</template>
<style scoped>
.standard-full {
  width: 100%;
}
.standard-formula-tools {
  margin-bottom: 10px;
}
.standard-formula-code {
  font-family: ui-monospace, monospace;
  font-size: 13px;
}
.standard-formula-preview {
  padding: 10px 0;
  color: var(--ink-2, #595959);
  overflow-wrap: anywhere;
}
.standard-formula-check {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  font-size: 12px;
  color: var(--ink-3, #737373);
}
</style>
