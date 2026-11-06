<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { ActivityInput, ActivityOptions } from '../../../api/financeActivity'
import ActivitySpacePicker from './ActivitySpacePicker.vue'
const props = defineProps<{ model: ActivityInput; options: ActivityOptions; saving: boolean }>()
const { t } = useI18n()
const open = ref(false)
const names = computed(() => new Map(props.options.spaces.map((node) => [node.id, node])))
</script>
<template>
  <SectionCard
    icon="EnvironmentOutlined"
    :title="t('Activity.targets')"
  >
    <a-form-item
      name="targetIds"
      :rules="[
        { required: true, type: 'array', min: 1, message: t('Finance.required', { field: t('Activity.targets') }) }
      ]"
    >
      <div class="activity-target-actions">
        <span>{{ t('Activity.selectedSpaces', { count: model.targetIds.length }) }}</span>
        <a-button
          :disabled="saving"
          @click="open = true"
        >
          <AIcon type="ApartmentOutlined" />
          {{ t('Activity.chooseSpaces') }}
        </a-button>
      </div>
      <div
        v-if="model.targetIds.length"
        class="activity-selected-spaces"
      >
        <a-tag
          v-for="id in model.targetIds"
          :key="id"
          :closable="!saving"
          @close="model.targetIds = model.targetIds.filter((value) => value !== id)"
        >
          {{ names.get(id)?.fullName || t('Activity.unavailable') }}
        </a-tag>
      </div>
    </a-form-item>
  </SectionCard>
  <ActivitySpacePicker
    v-if="open"
    :spaces="options.spaces"
    :selected-ids="model.targetIds"
    :busy="saving"
    @close="open = false"
    @pick="
      (ids) => {
        model.targetIds = [...ids]
        open = false
      }
    "
  />
</template>
<style scoped>
.activity-target-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
}
.activity-selected-spaces {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  max-height: 180px;
  overflow: auto;
  margin-top: 16px;
}
.activity-selected-spaces :deep(.ant-tag) {
  max-width: 100%;
  margin: 0;
  white-space: normal;
  overflow-wrap: anywhere;
  padding: 4px 10px;
}
</style>
