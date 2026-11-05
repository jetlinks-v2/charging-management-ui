<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { AccountingPeriod } from '../../../api/financeAccounting'
defineProps<{ periods: AccountingPeriod[]; selected: string; disabled: boolean }>()
const emit = defineEmits<{ select: [month: string] }>()
const { t } = useI18n()
</script>
<template>
  <ResponsiveGrid
    :min="210"
    :gap="12"
    class="period-ledger"
  >
    <button
      v-for="period in periods"
      :key="period.id"
      type="button"
      class="period-choice"
      :class="{ selected: selected === period.accountMonth }"
      :disabled="disabled"
      :aria-pressed="selected === period.accountMonth"
      @click="emit('select', period.accountMonth)"
    >
      <EntityCard
        :interactive="false"
        :title="t('MonthClosing.monthLabel', { month: Number(period.accountMonth.slice(5)) })"
      >
        <template #badges>
          <a-tag :color="period.status === 'CLOSED' ? 'green' : 'default'">
            {{ t('MonthClosing.status.' + period.status) }}
          </a-tag>
        </template>
        <template #body>
          <span class="period-range">{{ period.startDate }} ~ {{ period.endDate }}</span>
        </template>
        <template #footer>
          <span>
            {{
              period.status === 'CLOSED'
                ? t('MonthClosing.closedBy', { name: period.closedName || '—' })
                : t('MonthClosing.awaitingClose')
            }}
          </span>
        </template>
      </EntityCard>
    </button>
  </ResponsiveGrid>
</template>
<style scoped>
.period-choice {
  padding: 0;
  border: 1px solid transparent;
  border-radius: var(--jet-theme-radius-sm, 6px);
  background: transparent;
  text-align: start;
  min-width: 0;
  color: inherit;
  cursor: pointer;
}
.period-choice:hover:not(:disabled),
.period-choice.selected {
  border-color: var(--ant-primary-color, #1677ff);
}
.period-choice:focus-visible {
  outline: 2px solid var(--ant-primary-color, #1677ff);
  outline-offset: 3px;
}
.period-choice:disabled {
  cursor: default;
}
.period-choice :deep(.entity-card) {
  box-shadow: none;
  border-color: var(--ant-color-border-secondary, #e8e8e8);
  background: var(--ant-component-background, white);
}
.period-choice.selected :deep(.entity-card) {
  background: var(--ant-primary-1, #e6f4ff);
  border-color: transparent;
}
.period-choice :deep(.ec-top) {
  padding-bottom: 8px;
}
.period-choice :deep(.ec-body) {
  padding: 8px 0;
}
.period-choice :deep(.ec-footer) {
  font-size: 12px;
  color: var(--ant-color-text-secondary, #595959);
}
.period-range {
  font-size: 12px;
  white-space: normal;
  font-variant-numeric: tabular-nums;
}
.period-choice :deep(.ant-tag) {
  margin-inline-end: 0;
}
</style>
