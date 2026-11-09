<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import JEcharts from '@jetlinks-web-core/components/Echarts'
import type { AnalysisRow } from '../../../../api/financeAnalysis'
const props = defineProps<{ summary: AnalysisRow }>()
const emit = defineEmits<{ (event: 'drill', row: AnalysisRow, group: string): void }>()
const { t } = useI18n()
const buckets = [
  ['NOT_DUE', 'notDue'],
  ['DAYS_30', 'days30'],
  ['DAYS_90', 'days90'],
  ['DAYS_180', 'days180'],
  ['DAYS_365', 'days365'],
  ['OVER_365', 'over365'],
  ['UNDATED', 'undated']
]
const option = computed(() => ({
  color: ['#1677ff'],
  grid: { left: 104, right: 16, top: 12, bottom: 28 },
  tooltip: { trigger: 'axis', valueFormatter: (value: unknown) => `${value} ${t('Report.currency')}` },
  xAxis: { type: 'value', axisLabel: { hideOverlap: true }, splitLine: { lineStyle: { color: '#f0f0f0' } } },
  yAxis: {
    type: 'category',
    inverse: true,
    data: buckets.map(([key]) => t('Analysis.enums.' + key)),
    axisLine: { show: false },
    axisTick: { show: false }
  },
  series: [
    {
      type: 'bar',
      barMaxWidth: 18,
      itemStyle: { borderRadius: [0, 3, 3, 0] },
      data: buckets.map(([, key]) => Number(props.summary[key] || 0))
    }
  ]
}))
const events = {
  click: (value: unknown) => {
    const event = value as { dataIndex?: number }
    if (typeof event.dataIndex === 'number' && buckets[event.dataIndex])
      emit('drill', { age: buckets[event.dataIndex][0] }, 'AGE')
  }
}
</script>
<template>
  <aside class="analysis-aging">
    <h3>{{ t('Analysis.columns.age') }}</h3>
    <JEcharts
      :option="option"
      :events="events"
      renderer="svg"
    />
  </aside>
</template>
<style scoped>
.analysis-aging {
  display: flex;
  flex-direction: column;
  flex: 0 0 280px;
  min-height: 0;
  padding-right: 16px;
  border-right: 1px solid var(--ant-color-border-secondary, #f0f0f0);
}
.analysis-aging h3 {
  margin: 0 0 12px;
  font-size: 14px;
  font-weight: 600;
}
.analysis-aging :deep(.echarts-warp) {
  flex: 1;
  min-height: 0;
}
@media (max-width: 1400px) {
  .analysis-aging {
    flex-basis: 248px;
  }
}
</style>
