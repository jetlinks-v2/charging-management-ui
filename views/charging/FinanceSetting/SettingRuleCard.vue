<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { HouseInfo, SettingInput, SettingOptions } from '../../../api/financeSetting'
import { settingFormulaValues, settlementMonths } from '../../../utils/settingFormulaValues'
const props = defineProps<{
  model: SettingInput
  index: number
  options: SettingOptions
  houses: HouseInfo[]
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
const previewSpaceId = ref('')
const previewHouse = computed(
  () => props.houses.find((house) => house.spaceId === previewSpaceId.value) || props.houses[0]
)
const variables = computed(() =>
  standard.value ? settingFormulaValues(standard.value, previewHouse.value, props.model.variableValues) : []
)
const months = computed(() => standard.value && settlementMonths(standard.value.settlementMethod))
const previewByHouse = computed(
  () => props.houses.length > 1 && variables.value.some((row) => row.code === 'BILLING_AREA')
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
      <a-form-item
        v-if="previewByHouse"
        :label="t('Setting.previewHouse')"
      >
        <a-select
          :value="previewHouse?.spaceId"
          :options="houses.map((house) => ({ value: house.spaceId, label: house.fullName }))"
          show-search
          option-filter-prop="label"
          @update:value="previewSpaceId = String($event)"
        />
      </a-form-item>
      <div
        v-if="variables.length"
        class="finance-form-grid"
      >
        <a-form-item
          v-for="variable in variables"
          :key="variable.code"
          :name="variable.readonly ? undefined : ['rules', index, 'variableValues', variable.code]"
          :label="variable.name"
          :rules="
            variable.readonly ? [] : [{ required: true, message: t('Finance.required', { field: variable.name }) }]
          "
        >
          <a-input
            v-if="variable.readonly"
            :value="variable.value"
            class="setting-variable-value"
            disabled
          />
          <a-input-number
            v-else
            v-model:value="model.variableValues[variable.code]"
            string-mode
            :min="0"
            :precision="6"
            class="setting-full"
          />
        </a-form-item>
      </div>
      <p
        v-if="months && variables.some((row) => row.code === 'PERIOD_MONTHS')"
        class="setting-help"
      >
        {{ t('Setting.periodHint', { months }) }}
      </p>
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
