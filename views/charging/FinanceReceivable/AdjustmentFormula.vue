<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import dayjs, { type Dayjs } from 'dayjs'
import type { AdjustmentInput, Receivable } from '../../../api/financeReceivable'
defineProps<{ model: AdjustmentInput; detail: Receivable }>()
const { t } = useI18n()
const disabledDate = (date: Dayjs, detail: Receivable) =>
  date.isBefore(dayjs(detail.calcStartDate), 'day') || date.isAfter(dayjs(detail.calcEndDate), 'day')
</script>
<template>
  <p class="adjustment-formula">{{ detail.snapshot?.standard.formulaDisplay }}</p>
  <div class="adjustment-grid">
    <a-form-item
      :label="t('Receivable.calcStartDate')"
      :name="['formulaLine', 'afterCalcStartDate']"
      :rules="[{ required: true, message: t('Adjustment.dateRequired') }]"
    >
      <a-date-picker
        v-model:value="model.formulaLine.afterCalcStartDate"
        value-format="YYYY-MM-DD"
        :allow-clear="false"
        :disabled-date="(date) => disabledDate(date, detail)"
      />
    </a-form-item>
    <a-form-item
      :label="t('Receivable.calcEndDate')"
      :name="['formulaLine', 'afterCalcEndDate']"
      :rules="[{ required: true, message: t('Adjustment.dateRequired') }]"
    >
      <a-date-picker
        v-model:value="model.formulaLine.afterCalcEndDate"
        value-format="YYYY-MM-DD"
        :allow-clear="false"
        :disabled-date="(date) => disabledDate(date, detail)"
      />
    </a-form-item>
    <a-form-item
      v-for="variable in detail.snapshot?.standard.variablesSnapshot.filter(
        (row) => row.variableCode !== 'PERIOD_MONTHS'
      )"
      :key="variable.variableCode"
      :label="variable.variableName"
      :name="['formulaLine', 'afterVariableValues', variable.variableCode]"
      :rules="[{ required: true, message: t('Finance.required', { field: variable.variableName }) }]"
    >
      <a-input-number
        v-model:value="model.formulaLine.afterVariableValues[variable.variableCode]"
        string-mode
        :precision="2"
        :min="
          ['STANDARD_PRICE', 'BILLING_AREA', 'IMPORTED_CONTRACT_AMOUNT'].includes(variable.variableCode)
            ? '0'
            : undefined
        "
        :max="'999999999999999999.99'"
      />
    </a-form-item>
  </div>
  <p class="adjustment-note">{{ t('Adjustment.formulaHint') }}</p>
</template>
