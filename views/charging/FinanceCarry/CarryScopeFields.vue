<script setup lang="ts">
import { computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { CarryInput, CarrySubject, CarryStandard } from '../../../api/financeCarry'
const props = defineProps<{ model: CarryInput; subjects: CarrySubject[]; standards: CarryStandard[] }>()
const { t } = useI18n()
const required = (key: string) => [{ required: true, message: t('Finance.required', { field: t('Carry.' + key) }) }]
const subject = computed<string | undefined>({
  get: () => props.model.subjectIds[0],
  set: (value) => {
    props.model.subjectIds = value ? [value] : []
  }
})
const standard = computed<string | undefined>({
  get: () => props.model.standardIds?.[0],
  set: (value) => {
    props.model.standardIds = value ? [value] : []
  }
})
const availableStandards = computed(() =>
  props.standards.filter((row) => props.model.subjectIds.includes(row.subjectId))
)
watch(
  () => [...props.model.subjectIds],
  () => {
    props.model.standardIds = props.model.standardIds?.filter((id) =>
      availableStandards.value.some((row) => row.id === id)
    )
  },
  { immediate: true }
)
</script>
<template>
  <SectionCard
    icon="ProfileOutlined"
    :title="t('Carry.scope')"
  >
    <a-form-item
      name="name"
      :label="t('Carry.name')"
      :rules="required('name')"
    >
      <a-input
        v-model:value="model.name"
        :maxlength="100"
      />
    </a-form-item>
    <a-form-item
      name="subjectIds"
      :label="t('Carry.subjects')"
      :rules="required('subjects')"
    >
      <a-select
        v-model:value="subject"
        show-search
        option-filter-prop="label"
        :options="
          subjects.map((row) => ({ value: row.id, label: row.name + ' · ' + row.code, disabled: !row.enabled }))
        "
        :placeholder="t('Carry.chooseSubjects')"
      />
    </a-form-item>
    <a-form-item
      name="standardIds"
      :label="t('Carry.standards')"
      :rules="required('standards')"
    >
      <a-select
        v-model:value="standard"
        show-search
        allow-clear
        option-filter-prop="label"
        :disabled="!model.subjectIds.length"
        :options="availableStandards.map((row) => ({ value: row.id, label: row.name + ' · ' + row.code }))"
        :placeholder="t('Carry.chooseStandard')"
      />
    </a-form-item>
    <div class="finance-form-grid">
      <a-form-item
        name="periodStart"
        :label="t('Carry.periodStart')"
        :rules="required('periodStart')"
      >
        <a-date-picker
          :placeholder="t('Carry.periodStart')"
          v-model:value="model.periodStart"
          value-format="YYYY-MM-DD"
          class="carry-full"
        />
      </a-form-item>
      <a-form-item
        name="periodEnd"
        :label="t('Carry.periodEnd')"
        :rules="[
          ...required('periodEnd'),
          {
            validator: async () => {
              if (model.periodEnd && model.periodStart && model.periodEnd < model.periodStart)
                throw new Error(t('Carry.periodInvalid'))
            }
          }
        ]"
      >
        <a-date-picker
          :placeholder="t('Carry.periodEnd')"
          v-model:value="model.periodEnd"
          value-format="YYYY-MM-DD"
          class="carry-full"
        />
      </a-form-item>
    </div>
    <p class="carry-note">{{ t('Carry.scopeHint') }}</p>
  </SectionCard>
</template>
