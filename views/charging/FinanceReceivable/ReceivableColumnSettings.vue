<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { useReceivableColumns } from '../../../hooks/finance-receivable/useReceivableColumns'
defineProps<{ state: ReturnType<typeof useReceivableColumns> }>()
const { t } = useI18n()
</script>
<template>
  <a-popover
    trigger="click"
    placement="bottomRight"
  >
    <a-button :aria-label="t('Receivable.columns')">
      <AIcon type="SettingOutlined" />
      {{ t('Receivable.columns') }}
    </a-button>
    <template #content>
      <div class="column-settings">
        <div class="column-settings-head">
          <strong>{{ t('Receivable.columns') }}</strong>
          <a-button
            type="link"
            size="small"
            @click="state.update()"
          >
            {{ t('Receivable.resetColumns') }}
          </a-button>
        </div>
        <p>{{ t('Receivable.columnHint') }}</p>
        <div
          v-for="option in state.options.value"
          :key="option.key"
          class="column-settings-row"
        >
          <a-checkbox
            :checked="!state.preferences.value[option.key]?.hidden"
            :disabled="option.locked"
            @change="state.update(option.key, { hidden: !$event.target.checked })"
          >
            {{ option.title }}
          </a-checkbox>
          <a-input-number
            :aria-label="option.title + ' ' + t('Receivable.columnWidth')"
            :value="state.preferences.value[option.key]?.width"
            :min="90"
            :max="600"
            :step="10"
            size="small"
            @change="(value) => state.update(option.key, { width: Number(value) })"
          />
        </div>
      </div>
    </template>
  </a-popover>
</template>
<style scoped>
.column-settings {
  width: min(300px, 75vw);
}
.column-settings-head,
.column-settings-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.column-settings-row {
  padding: 6px 0;
}
.column-settings-row :deep(.ant-input-number) {
  width: 76px;
}
.column-settings p {
  color: var(--ant-color-text-secondary, #595959);
  font-size: 12px;
  margin: 8px 0;
}
</style>
