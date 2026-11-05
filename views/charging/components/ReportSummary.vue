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
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 20px;
  padding: 18px 0 22px;
  margin: 0 0 18px;
  border-top: 1px solid var(--ant-color-border-secondary, #f0f0f0);
  border-bottom: 1px solid var(--ant-color-border-secondary, #f0f0f0);
}
.report-summary dt {
  color: var(--ant-color-text-secondary, #595959);
  font-size: 13px;
  margin-bottom: 8px;
}
.report-summary dd {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  overflow-wrap: anywhere;
}
.report-summary small {
  font-size: 12px;
  font-weight: 400;
  margin-left: 5px;
}
@media (max-width: 1100px) {
  .report-summary {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
@media (max-width: 560px) {
  .report-summary {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .report-summary dd {
    font-size: 18px;
  }
}
</style>
