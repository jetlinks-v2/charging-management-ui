<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { OverviewResult } from '../../../api/financeOverview'
import {
  overviewMoney,
  collectionOption,
  arrearsOption,
  balanceOption,
  trendOption
} from '../../../utils/overviewCharts'
import OverviewChart from './OverviewChart.vue'
const props = defineProps<{ data: OverviewResult; start: string; end: string }>()
const { t } = useI18n(),
  arrears = ref('age'),
  fund = ref('ADVANCE')
const collection = computed(() => collectionOption(props.data, t))
const trend = computed(() => trendOption(props.data, props.start, props.end, t))
const ages = computed(() => arrearsOption(props.data, arrears.value, t))
const balances = computed(() => balanceOption(props.data, fund.value, t))
const hasArrears = computed(() => Number(props.data.receivables.summary.overdueAmount) > 0)
const cashKeys = ['incomeAmount', 'refundAmount', 'netAmount'] as const
</script>
<template>
  <div class="overview-charts">
    <section class="overview-panel">
      <div class="overview-panel-heading">
        <h3>{{ t('Overview.collection') }}</h3>
        <span>{{ t('Overview.wan') }}</span>
      </div>
      <OverviewChart
        :label="t('Overview.collection')"
        :option="collection"
        :empty="!data.receivables.subjects.length"
      />
    </section>
    <section class="overview-panel">
      <div class="overview-panel-heading">
        <h3>{{ t('Overview.trend') }}</h3>
        <span>{{ t('Overview.wan') }}</span>
      </div>
      <OverviewChart
        :label="t('Overview.trend')"
        :option="trend"
        :empty="!data.cash.trend.length"
      />
      <dl class="overview-cash-summary">
        <div
          v-for="key in cashKeys"
          :key="key"
        >
          <dt>{{ t('Overview.' + (key === 'netAmount' ? 'netCash' : key)) }}</dt>
          <dd>{{ overviewMoney(data.cash.summary[key]) }}</dd>
        </div>
      </dl>
    </section>
    <section class="overview-panel">
      <div class="overview-panel-heading">
        <h3>{{ t('Overview.arrears') }}</h3>
        <a-radio-group
          v-model:value="arrears"
          size="small"
        >
          <a-radio-button value="age">{{ t('Overview.age') }}</a-radio-button>
          <a-radio-button value="subject">{{ t('Overview.subject') }}</a-radio-button>
        </a-radio-group>
      </div>
      <div class="overview-arrears">
        <strong>{{ overviewMoney(data.receivables.summary.overdueAmount) }}</strong>
        <span>
          {{ t('Overview.wan') }} · {{ t('Overview.arrearsHouses', { count: data.receivables.overdueHouseCount }) }}
        </span>
      </div>
      <OverviewChart
        :label="t('Overview.arrears')"
        :option="ages"
        :empty="!hasArrears"
      />
    </section>
    <section class="overview-panel">
      <div class="overview-panel-heading">
        <h3>{{ t('Overview.balances') }}</h3>
        <span>{{ t('Overview.currentWan') }}</span>
      </div>
      <dl class="overview-balances">
        <div
          v-for="key in ['advanceAmount', 'depositAmount'] as const"
          :key="key"
        >
          <dt>{{ t('Overview.' + key) }}</dt>
          <dd>
            {{ overviewMoney(data.balances[key]) }}
            <small>{{ t('Overview.wan') }}</small>
          </dd>
        </div>
      </dl>
      <a-radio-group
        v-model:value="fund"
        size="small"
      >
        <a-radio-button value="ADVANCE">{{ t('Overview.advance') }}</a-radio-button>
        <a-radio-button value="DEPOSIT">{{ t('Overview.deposit') }}</a-radio-button>
      </a-radio-group>
      <OverviewChart
        :label="t('Overview.balances')"
        :option="balances"
        :empty="!data.balances.items.some((row) => row.type === fund)"
      />
    </section>
  </div>
</template>
