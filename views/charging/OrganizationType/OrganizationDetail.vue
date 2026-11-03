<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { PropType } from 'vue'
import type { OrganizationType, OrganizationTypeValue, PropertyOrganization } from '../../../api/organization'
import OrganizationSpaces from './OrganizationSpaces.vue'

defineProps({
  organization: { type: Object as PropType<PropertyOrganization>, required: true },
  state: {
    type: Object as PropType<{
      editable: boolean
      saving: boolean
      types: OrganizationType[]
      parentName?: string
    }>,
    required: true
  },
  dateText: { type: Function as PropType<(time?: number) => string>, required: true }
})
const emit = defineEmits<{ (event: 'save', value: OrganizationTypeValue | null): void }>()
const { t } = useI18n()
const key = 'OrganizationType.'
</script>

<template>
  <section class="organization-detail">
    <header class="organization-detail__heading">
      <h2>{{ organization.name }}</h2>
      <a-tag
        :color="
          organization.organizationType?.value === 'project'
            ? 'blue'
            : organization.organizationType
              ? 'purple'
              : undefined
        "
      >
        {{ organization.organizationType?.text || t(key + 'unmarked') }}
      </a-tag>
    </header>
    <p class="organization-detail__parent">
      {{ t(key + 'parent') }}：{{ state.parentName || t(key + 'noVisibleParent') }}
    </p>
    <section class="organization-detail__type">
      <h3>{{ t(key + 'type') }}</h3>
      <a-radio-group
        :value="organization.organizationType?.value"
        :disabled="!state.editable"
        @change="emit('save', $event.target.value)"
      >
        <a-radio
          v-for="option in state.types"
          :key="option.value"
          :value="option.value"
        >
          {{ option.text }}
        </a-radio>
      </a-radio-group>
      <p class="organization-detail__hint">{{ t(key + 'typeHint') }}</p>
      <div class="organization-detail__actions">
        <a-button
          :disabled="!state.editable || !organization.organizationType"
          @click="emit('save', null)"
        >
          {{ t(key + 'clear') }}
        </a-button>
        <a-spin
          v-if="state.saving"
          size="small"
        />
        <span class="organization-detail__hint">{{ t(key + (state.saving ? 'saving' : 'autoSave')) }}</span>
      </div>
    </section>
    <OrganizationSpaces
      :key="organization.id"
      :organization-id="organization.id"
    />
    <section class="organization-detail__info">
      <h3>{{ t(key + 'information') }}</h3>
      <a-descriptions
        :column="1"
        size="small"
      >
        <a-descriptions-item :label="t(key + 'id')">{{ organization.id }}</a-descriptions-item>
        <a-descriptions-item :label="t(key + 'sourceUpdateTime')">
          {{ dateText(organization.sourceUpdateTime) }}
        </a-descriptions-item>
        <a-descriptions-item :label="t(key + 'modifier')">{{ organization.modifierName || '—' }}</a-descriptions-item>
        <a-descriptions-item :label="t(key + 'modifyTime')">
          {{ dateText(organization.modifyTime) }}
        </a-descriptions-item>
      </a-descriptions>
    </section>
  </section>
</template>

<style scoped src="./OrganizationDetail.css"></style>
