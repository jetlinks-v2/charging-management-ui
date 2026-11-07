<script setup lang="ts">
import { computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { CarryInput, CarrySubject, CarryStandard } from '../../../api/financeCarry'
const props = defineProps<{ model: CarryInput; subjects: CarrySubject[]; standards: CarryStandard[] }>()
const { t } = useI18n()
const required = (key: string) => [{ required: true, message: t('Finance.required', { field: t('Carry.' + key) }) }]
const availableStandards = computed(() =>
  props.standards.filter((row) => props.model.subjectIds.includes(row.subjectId))
)
watch(
  () => [...props.model.subjectIds],
  () => {
    props.model.standardIds = props.model.standardIds?.filter((id) =>
      availableStandards.value.some((row) => row.id === id)
    )
  }
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
        v-model:value="model.subjectIds"
        mode="multiple"
        show-search
        option-filter-prop="label"
        :max-tag-count="3"
        :options="
          subjects.map((row) => ({ value: row.id, label: row.name + ' · ' + row.code, disabled: !row.enabled }))
        "
        :placeholder="t('Carry.chooseSubjects')"
      />
    </a-form-item>
    <a-form-item
      name="standardIds"
      :label="t('Carry.standards')"
    >
      <a-select
        v-model:value="model.standardIds"
        mode="multiple"
        show-search
        allow-clear
        option-filter-prop="label"
        :max-tag-count="3"
        :disabled="!model.subjectIds.length"
        :options="availableStandards.map((row) => ({ value: row.id, label: row.name + ' · ' + row.code }))"
        :placeholder="t('Carry.allStandards')"
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
