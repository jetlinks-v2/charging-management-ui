<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { TierPrice } from '../../../hooks/finance-standard/tieredFormula'
const props = defineProps<{ rows: TierPrice[]; unit: string; readonly?: boolean }>()
const emit = defineEmits<{ 'update:rows': [TierPrice[]]; remove: [number] }>()
const { t } = useI18n()
const columns = computed(() => [
  { title: t('Standard.tierBand'), key: 'band', width: 70 },
  { title: t('Standard.tierUsage', { unit: props.unit }), key: 'range' },
  { title: t('Standard.tierPrice', { unit: props.unit }), key: 'price', width: 180 },
  ...(!props.readonly ? [{ title: t('Finance.actions'), key: 'actions', width: 60 }] : [])
])
const rowKey = (row: TierPrice, index?: number) => index ?? props.rows.indexOf(row)
function update(index: number, key: keyof TierPrice, value: unknown) {
  emit(
    'update:rows',
    props.rows.map((row, current) =>
      current === index ? { ...row, [key]: value == null ? null : String(value) } : row
    )
  )
}
</script>
<template>
  <a-table
    :data-source="rows"
    :columns="columns"
    :row-key="rowKey"
    :pagination="false"
    size="small"
    class="standard-tiers"
  >
    <template #bodyCell="{ column, record, index }">
      <template v-if="column.key === 'band'">{{ index + 1 }}</template>
      <div
        v-else-if="column.key === 'range'"
        class="standard-tier-range"
      >
        <span>{{ index === 0 ? '0' : rows[index - 1].upper || '—' }}</span>
        <span class="standard-tier-separator">{{ t('Standard.tierTo') }}</span>
        <span v-if="index === rows.length - 1">{{ t('Standard.tierUnlimited') }}</span>
        <span v-else-if="readonly">{{ record.upper }}</span>
        <a-input-number
          v-else
          :value="record.upper ?? undefined"
          string-mode
          :min="'0'"
          :max="'999999999999999999.99'"
          :precision="2"
          :aria-label="t('Standard.tierUpper')"
          :placeholder="t('Standard.tierUpper')"
          @update:value="update(index, 'upper', $event)"
        />
      </div>
      <template v-else-if="column.key === 'price'">
        <span v-if="readonly">{{ record.price }}</span>
        <a-input-number
          v-else
          :value="record.price ?? undefined"
          string-mode
          :min="'0'"
          :max="'999999999999999999.99'"
          :precision="2"
          :aria-label="t('Standard.tierPrice', { unit })"
          :placeholder="t('Standard.price')"
          @update:value="update(index, 'price', $event)"
        />
      </template>
      <a-button
        v-else-if="column.key === 'actions'"
        type="text"
        danger
        :disabled="rows.length <= 1"
        :aria-label="t('Finance.delete')"
        @click="emit('remove', index)"
      >
        <AIcon type="DeleteOutlined" />
      </a-button>
    </template>
  </a-table>
</template>
<style scoped>
.standard-tier-range {
  display: flex;
  align-items: center;
  gap: 8px;
}
.standard-tier-range > span:first-child {
  min-width: 28px;
}
.standard-tier-separator {
  color: var(--ink-3, #737373);
}
.standard-tiers :deep(.ant-input-number) {
  width: 100%;
}
.standard-tier-range :deep(.ant-input-number) {
  flex: 1;
  min-width: 100px;
}
</style>
