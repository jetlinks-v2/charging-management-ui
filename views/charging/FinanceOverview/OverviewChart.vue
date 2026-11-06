<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import JEcharts from '@jetlinks-web-core/components/Echarts'
import type { EChartsCoreOption } from 'echarts/core'
const props = defineProps<{ option: EChartsCoreOption; empty?: boolean; label: string }>()
const failed = ref(false),
  { t } = useI18n()
watch(
  () => props.option,
  () => {
    failed.value = false
  }
)
</script>
<template>
  <div
    class="overview-chart"
    role="img"
    :aria-label="label"
  >
    <CloudEmpty
      v-if="failed || empty"
      :description="t(failed ? 'Overview.chartFailed' : 'Overview.noRecords')"
    />
    <!-- 平台 JEcharts 已处理容器 ResizeObserver 与激活/销毁，不再重复维护窗口监听。 -->
    <JEcharts
      v-else
      :option="option"
      renderer="svg"
      @error="failed = true"
    />
  </div>
</template>
