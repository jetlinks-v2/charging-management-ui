<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { SettingInput, SettingOptions } from '../../../api/financeSetting'
const props = defineProps<{
  model: SettingInput
  index: number
  options: SettingOptions
  lockedSubject: boolean
  removable: boolean
}>()
const emit = defineEmits<{ remove: [] }>()
const { t } = useI18n()
const standard = computed(() => props.options.standards.find((row) => row.id === props.model.standardId))
const subjectOptions = computed(() =>
  props.options.projectSubjects.map((row) => ({
    value: row.id,
    label:
      props.options.standards.find((std) => std.subjectId === row.subjectId)?.subjectName || t('Setting.noStandard')
  }))
)
const availableStandards = computed(() =>
  props.options.standards.filter(
    (row) =>
      row.subjectId ===
      props.options.projectSubjects.find((subject) => subject.id === props.model.projectSubjectId)?.subjectId
  )
)
const editableVariables = computed(
  () =>
    standard.value?.variablesSnapshot.filter(
      (row) => !['STANDARD_PRICE', 'BILLING_AREA', 'PERIOD_MONTHS'].includes(row.variableCode)
    ) || []
)
const required = (key: string) => [{ required: true, message: t('Finance.required', { field: t('Setting.' + key) }) }]
function changeSubject() {
  props.model.standardId = ''
  changeStandard()
}
function changeStandard() {
  props.model.variableValues = {}
}
</script>
<template>
  <div class="setting-rule">
    <div class="setting-rule-heading">
      <strong>{{ t('Setting.ruleNumber', { index: index + 1 }) }}</strong>
      <a-button
        v-if="removable"
        type="text"
        danger
        @click="emit('remove')"
      >
        {{ t('Finance.delete') }}
      </a-button>
    </div>

    <div class="finance-form-grid">
      <a-form-item
        :name="['rules', index, 'projectSubjectId']"
        :label="t('Setting.subject')"
        :rules="required('subject')"
      >
        <a-select
          v-model:value="model.projectSubjectId"
          :options="subjectOptions"
          show-search
          option-filter-prop="label"
          :disabled="lockedSubject"
          @change="changeSubject"
        />
      </a-form-item>
      <a-form-item
        :name="['rules', index, 'standardId']"
        :label="t('Setting.standard')"
        :rules="required('standard')"
      >
        <a-select
          v-model:value="model.standardId"
          :options="
            availableStandards.map((row) => ({ value: row.id, label: row.standardName + ' · ' + row.standardCode }))
          "
          show-search
          option-filter-prop="label"
          :placeholder="t('Setting.chooseStandard')"
          @change="changeStandard"
        />
      </a-form-item>
      <a-form-item
        :name="['rules', index, 'effectiveStartDate']"
        :label="t('Setting.start')"
        :rules="required('start')"
      >
        <a-date-picker
          v-model:value="model.effectiveStartDate"
          value-format="YYYY-MM-DD"
          class="setting-full"
        />
      </a-form-item>
      <a-form-item
        :name="['rules', index, 'effectiveEndDate']"
        :label="t('Setting.end')"
      >
        <a-date-picker
          :value="model.effectiveEndDate || undefined"
          value-format="YYYY-MM-DD"
          :placeholder="t('Setting.unlimited')"
          class="setting-full"
          @update:value="model.effectiveEndDate = $event ? String($event) : null"
        />
      </a-form-item>
    </div>
    <p
      v-if="standard"
      class="setting-help"
    >
      {{ t('Setting.standardValidity') }}：{{ standard.executeDate || t('Standard.unlimitedStart') }} ～
      {{ standard.cancelDate || t('Setting.unlimited') }}
    </p>

    <div
      v-if="standard"
      class="setting-rule-formula"
    >
      <div class="setting-rule-summary">
        <strong>{{ standard.price }}</strong>
        <span>{{ t('Setting.' + standard.settlementMethod) }}</span>
      </div>
      <p class="setting-formula">{{ standard.formulaDisplay }}</p>
      <div
        v-if="editableVariables.length"
        class="finance-form-grid"
      >
        <a-form-item
          v-for="variable in editableVariables"
          :key="variable.variableCode"
          :name="['rules', index, 'variableValues', variable.variableCode]"
          :label="variable.variableName"
          :rules="[{ required: true, message: t('Finance.required', { field: variable.variableName }) }]"
        >
          <a-input-number
            v-model:value="model.variableValues[variable.variableCode]"
            string-mode
            :min="0"
            :precision="6"
            class="setting-full"
          />
        </a-form-item>
      </div>
      <p class="setting-help">{{ t('Setting.trustedHint') }}</p>
    </div>
    <a-form-item
      :name="['rules', index, 'remark']"
      :label="t('Setting.remark')"
    >
      <a-textarea
        v-model:value="model.remark"
        :rows="2"
        :maxlength="300"
      />
    </a-form-item>
  </div>
</template>
<style scoped src="./SettingDrawer.css"></style>
