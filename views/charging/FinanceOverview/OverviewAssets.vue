<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { OverviewResult } from '../../../api/financeOverview'
import { overviewMoney } from '../../../utils/overviewCharts'
const props = defineProps<{ houses: OverviewResult['houses'] }>()
const { t } = useI18n()
const fixed = computed(() => [
  { key: 'houses', icon: 'HomeOutlined', value: props.houses.houseCount.toLocaleString(), unit: t('Overview.rooms') },
  {
    key: 'buildingArea',
    icon: 'BorderOuterOutlined',
    value: overviewMoney(props.houses.buildingArea, false),
    unit: '㎡'
  },
  { key: 'billingArea', icon: 'CalculatorOutlined', value: overviewMoney(props.houses.billingArea, false), unit: '㎡' },
  {
    key: 'incomplete',
    icon: 'FormOutlined',
    value: props.houses.incompleteCount.toLocaleString(),
    unit: t('Overview.rooms')
  }
])
</script>
<template>
  <section
    class="overview-panel overview-assets"
    :aria-label="t('Overview.assets')"
  >
    <div class="overview-fixed">
      <div
        v-for="item in fixed"
        :key="item.key"
      >
        <AIcon
          :type="item.icon"
          class="overview-asset-icon"
          aria-hidden="true"
        />
        <dl>
          <dt>{{ t('Overview.' + item.key) }}</dt>
          <dd>
            {{ item.value }}
            <small>{{ item.unit }}</small>
          </dd>
        </dl>
      </div>
    </div>
    <dl class="overview-states">
      <div
        v-for="item in houses.states"
        :key="item.value || item.text"
      >
        <dt>
          <j-ellipsis>{{ item.text || t('Overview.unset') }}</j-ellipsis>
        </dt>
        <dd>
          {{ item.count.toLocaleString() }}
          <small>{{ t('Overview.rooms') }}</small>
        </dd>
      </div>
    </dl>
  </section>
</template>
