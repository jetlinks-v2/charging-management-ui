<script setup lang="ts">
defineProps<{ label: string; items: { label: string; value?: string | null; unit: string }[] }>()
</script>
<template>
  <dl
    class="report-summary"
    :aria-label="label"
  >
    <div
      v-for="item in items"
      :key="item.label"
    >
      <dt>{{ item.label }}</dt>
      <dd>
        {{ item.value ?? '—' }}
        <small v-if="item.value != null">{{ item.unit }}</small>
      </dd>
    </div>
  </dl>
</template>
<style scoped>
.report-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 12px 28px;
  padding: 14px 18px;
  margin: 0;
  background: var(--ant-color-fill-quaternary, #fafafa);
  border: 1px solid var(--ant-color-border-secondary, #f0f0f0);
  border-radius: 6px;
}
.report-summary > div {
  display: flex;
  align-items: baseline;
  gap: 10px;
  flex: 1 0 auto;
}
.report-summary dt {
  color: var(--ant-color-text-secondary, #595959);
  font-size: 13px;
}
.report-summary dd {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.report-summary small {
  font-size: 12px;
  font-weight: 400;
  margin-left: 4px;
  color: var(--ant-color-text-secondary, #595959);
}
</style>
