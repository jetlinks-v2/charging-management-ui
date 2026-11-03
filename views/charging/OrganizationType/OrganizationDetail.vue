<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { PropType } from 'vue'
import type { OrganizationType, OrganizationTypeValue, PropertyOrganization } from '../../../api/organization'

defineProps({
  organization: { type: Object as PropType<PropertyOrganization>, required: true },
  state: { type: Object as PropType<{
    editable: boolean; saving: boolean; types: OrganizationType[]; parentName?: string
  }>, required: true },
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
      <a-tag :color="organization.organizationType?.value === 'project' ? 'blue' : organization.organizationType ? 'purple' : undefined">
        {{ organization.organizationType?.text || t(key + 'unmarked') }}
      </a-tag>
    </header>
    <p class="organization-detail__parent">{{ t(key + 'parent') }}：{{ state.parentName || t(key + 'noVisibleParent') }}</p>
    <section class="organization-detail__type">
      <h3>{{ t(key + 'type') }}</h3>
      <a-radio-group :value="organization.organizationType?.value" :disabled="!state.editable"
        @change="emit('save', $event.target.value)">
        <a-radio v-for="option in state.types" :key="option.value" :value="option.value">{{ option.text }}</a-radio>
      </a-radio-group>
      <p class="organization-detail__hint">{{ t(key + 'typeHint') }}</p>
      <div class="organization-detail__actions">
        <a-button :disabled="!state.editable || !organization.organizationType" @click="emit('save', null)">
          {{ t(key + 'clear') }}
        </a-button>
        <a-spin v-if="state.saving" size="small" />
        <span class="organization-detail__hint">{{ t(key + (state.saving ? 'saving' : 'autoSave')) }}</span>
      </div>
    </section>
    <section class="organization-detail__info">
      <h3>{{ t(key + 'information') }}</h3>
      <a-descriptions :column="1" size="small">
        <a-descriptions-item :label="t(key + 'id')">{{ organization.id }}</a-descriptions-item>
        <a-descriptions-item :label="t(key + 'code')">{{ organization.code || '—' }}</a-descriptions-item>
        <a-descriptions-item :label="t(key + 'sourceUpdateTime')">{{ dateText(organization.sourceUpdateTime) }}</a-descriptions-item>
        <a-descriptions-item :label="t(key + 'modifier')">{{ organization.modifierName || '—' }}</a-descriptions-item>
        <a-descriptions-item :label="t(key + 'modifyTime')">{{ dateText(organization.modifyTime) }}</a-descriptions-item>
      </a-descriptions>
    </section>
  </section>
</template>

<style scoped>
.organization-detail { padding: 28px; min-width: 0; }
.organization-detail__heading { display: flex; align-items: center; flex-wrap: wrap; gap: 12px; }
h2 { margin: 0; font-size: 22px; overflow-wrap: anywhere; }
h3 { margin: 0 0 16px; font-size: 15px; }
.organization-detail__parent, .organization-detail__hint { color: var(--color-jet-text-secondary, #777); }
.organization-detail__parent { margin: 10px 0 28px; overflow-wrap: anywhere; }
.organization-detail__type { padding-bottom: 28px; border-bottom: 1px solid var(--color-jet-border, #eee); }
.organization-detail__hint { margin: 12px 0; font-size: 12px; }
.organization-detail__actions { display: flex; gap: 12px; align-items: center; }
.organization-detail__info { padding-top: 24px; }
.organization-detail__info :deep(.ant-descriptions-item-content) { overflow-wrap: anywhere; }
@media (max-width: 700px) { .organization-detail { padding: 20px 16px; } }
</style>
