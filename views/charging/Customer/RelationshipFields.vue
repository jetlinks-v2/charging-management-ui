<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { Dayjs } from 'dayjs'
import type { RelationInput, Scope } from '../../../api/archive'
import type { useDictionaries } from '../../../hooks/archive/useDictionaries'
import { useFamilies } from '../../../hooks/archive/useFamilies'
const props = defineProps<{
  model: RelationInput
  type: 'person' | 'company'
  dictionary: ReturnType<typeof useDictionaries>
  scope: Scope
}>()
const { t } = useI18n()
const k = 'Archive.'
const { families, failed, loading, reload } = useFamilies(props.scope)
</script>
<template>
  <a-form-item
    :label="t(k + 'startTime')"
    name="startTime"
    :rules="[{ required: true, message: t(k + 'required') }]"
  >
    <a-date-picker
      :value="String(model.startTime)"
      value-format="x"
      show-time
      @change="
        (value: string | Dayjs) => {
          model.startTime = value ? Number(value) : 0
        }
      "
    />
  </a-form-item>
  <template v-if="type === 'person'">
    <a-form-item
      :label="t(k + 'nature')"
      name="nature"
      :rules="[{ required: true, message: t(k + 'required') }]"
    >
      <a-select
        v-model:value="model.nature"
        :options="dictionary.options('customer-nature')"
      />
    </a-form-item>
    <a-form-item
      :label="t(k + 'familyMode')"
      name="familyMode"
      :rules="[{ required: true, message: t(k + 'required') }]"
    >
      <a-radio-group v-model:value="model.familyMode">
        <a-radio value="new">{{ t(k + 'newFamily') }}</a-radio>
        <a-radio value="existing">{{ t(k + 'existingFamily') }}</a-radio>
      </a-radio-group>
    </a-form-item>
    <a-form-item
      v-if="model.familyMode === 'new'"
      :label="t(k + 'familyName')"
      name="familyName"
      :rules="[{ required: true, whitespace: true, message: t(k + 'required') }]"
    >
      <a-input
        v-model:value="model.familyName"
        :maxlength="128"
      />
    </a-form-item>
    <a-form-item
      v-else
      :label="t(k + 'family')"
      name="familyId"
      :rules="[{ required: true, message: t(k + 'required') }]"
    >
      <a-select
        v-model:value="model.familyId"
        :loading="loading"
        :options="families.map((item) => ({ value: item.id, label: item.name }))"
        :not-found-content="t(k + (failed ? 'familyFailed' : 'noFamilies'))"
      />
      <a-button
        v-if="failed"
        type="link"
        @click="reload"
      >
        {{ t(k + 'retry') }}
      </a-button>
    </a-form-item>
  </template>
</template>
