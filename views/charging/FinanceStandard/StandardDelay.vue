<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { StandardInput, StandardOptions } from '../../../api/financeStandard'
const props = defineProps<{ model: StandardInput; options: StandardOptions }>()
const { t } = useI18n()
const required = (key: string) => [{ required: true, message: t('Finance.required', { field: t('Standard.' + key) }) }]
const amountRules = [
  {
    validator: (_rule: unknown, value: string | null) => {
      const amount = Number(value)
      return amount > 0 && (props.model.delayCalcForm !== 1 || amount <= 100)
        ? Promise.resolve()
        : Promise.reject(new Error(t('Standard.delayAmountInvalid')))
    }
  }
]
</script>
<template>
  <a-form-item :label="t('Standard.isDelay')">
    <a-radio-group
      v-model:value="model.isDelay"
      :options="[
        { value: 0, label: t('Subject.no') },
        { value: 1, label: t('Subject.yes') }
      ]"
    />
  </a-form-item>
  <div
    v-if="model.isDelay"
    class="finance-form-grid"
  >
    <a-form-item
      name="delayCalcForm"
      :label="t('Standard.delayCalcForm')"
      :rules="required('delayCalcForm')"
    >
      <a-select
        :value="model.delayCalcForm ?? undefined"
        @update:value="model.delayCalcForm = $event == null ? null : Number($event)"
        :options="options.delayCalcForms.map((row) => ({ value: row.value, label: row.text }))"
      />
    </a-form-item>
    <a-form-item
      name="rateAmount"
      :label="t(model.delayCalcForm === 1 ? 'Standard.delayRatio' : 'Standard.delayAmount')"
      :rules="amountRules"
    >
      <a-space
        class="delay-amount"
        align="center"
      >
        <a-input-number
          :value="model.rateAmount ?? undefined"
          @update:value="model.rateAmount = $event == null ? null : String($event)"
          string-mode
          :min="'0.01'"
          :max="model.delayCalcForm === 1 ? '100' : '999999999999999999.99'"
          :precision="2"
          style="width: 100%"
        />
        <span>{{ model.delayCalcForm === 1 ? '%' : t('Standard.yuan') }}</span>
      </a-space>
    </a-form-item>
    <a-form-item
      name="delayRoundType"
      :label="t('Standard.delayRoundType')"
      :rules="required('delayRoundType')"
    >
      <a-select
        :value="model.delayRoundType ?? undefined"
        @update:value="model.delayRoundType = $event == null ? null : Number($event)"
        :options="options.delayRoundTypes.map((row) => ({ value: row.value, label: row.text }))"
      />
    </a-form-item>
    <a-form-item
      name="delayBaseType"
      :label="t('Standard.delayBaseType')"
      :rules="required('delayBaseType')"
    >
      <a-select
        :value="model.delayBaseType ?? undefined"
        @update:value="model.delayBaseType = $event == null ? null : String($event)"
        :options="options.delayBaseTypes.map((row) => ({ value: row.value, label: row.text }))"
      />
    </a-form-item>
  </div>
  <a-alert
    v-if="model.isDelay && model.delayRoundType === 1"
    :message="t('Standard.monthlyDelayHint')"
    type="info"
    show-icon
  />
</template>
<style scoped>
.delay-amount {
  display: flex;
}
.delay-amount :deep(.ant-space-item:first-child) {
  flex: 1;
  min-width: 0;
}
</style>
