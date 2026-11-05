<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { StandardInput, StandardOptions } from '../../../api/financeStandard'
const props = defineProps<{ model: StandardInput; options: StandardOptions }>()
const { t } = useI18n()
const enabled = computed({
  get: () => props.model.isDelay === 1,
  set: (value) => {
    props.model.isDelay = value ? 1 : 0
  }
})
const required = (key: string) => [{ required: true, message: t('Finance.required', { field: t('Standard.' + key) }) }]
</script>
<template>
  <a-form-item :label="t('Standard.isDelay')">
    <a-switch
      v-model:checked="enabled"
      :checked-children="t('Subject.yes')"
      :un-checked-children="t('Subject.no')"
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
      :label="t('Standard.rateAmount')"
      :rules="required('rateAmount')"
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
</template>
