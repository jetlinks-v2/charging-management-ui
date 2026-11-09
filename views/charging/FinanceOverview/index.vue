<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import FinancePage from '../components/FinancePage.vue'
import OverviewScope from './OverviewScope.vue'
import OverviewAssets from './OverviewAssets.vue'
import OverviewCharts from './OverviewCharts.vue'
import { useOverview } from '../../../hooks/finance-overview/useOverview'
import { overviewMoney } from '../../../utils/overviewCharts'
import './overview.css'
const { t } = useI18n(),
  state = useOverview()
const { projects, data, loading, failed, period, dates } = state
const moneyKeys = ['netAmount', 'receivedAmount', 'unreceivedAmount', 'collectionRate'] as const
const handoverKeys = ['unhandedAmount', 'pendingAmount', 'approvedAmount'] as const
const dateStart = computed(() => dates.value[0].format('YYYY-MM-DD'))
const dateEnd = computed(() => dates.value[1].format('YYYY-MM-DD'))
</script>
<template>
  <FinancePage fixed>
    <div class="overview-workspace">
      <OverviewScope :state="projects" />
      <OverviewAssets
        v-if="data"
        :houses="data.houses"
      />
      <div class="overview-section-heading">
        <h3>{{ t('Overview.collectionSummary') }}</h3>
        <div class="overview-date-controls">
          <a-radio-group
            :value="period"
            @change="state.selectPeriod($event.target.value)"
          >
            <a-radio-button
              v-for="key in ['month', 'year', 'custom']"
              :key="key"
              :value="key"
            >
              {{ t('Overview.' + key) }}
            </a-radio-button>
          </a-radio-group>
          <a-range-picker
            v-if="period === 'custom'"
            :value="dates"
            :allow-clear="false"
            @change="state.selectDates"
          />
        </div>
      </div>
      <a-spin
        :spinning="loading"
        class="overview-spinner"
      >
        <template v-if="data">
          <dl class="overview-money">
            <div
              v-for="key in moneyKeys"
              :key="key"
            >
              <dt>{{ t('Overview.' + key) }}</dt>
              <dd>
                {{
                  key === 'collectionRate'
                    ? Number(data.receivables.summary.netAmount) > 0
                      ? data.receivables.summary[key]
                      : '—'
                    : overviewMoney(data.receivables.summary[key])
                }}
                <small>{{ key === 'collectionRate' ? '%' : t('Overview.wan') }}</small>
              </dd>
            </div>
          </dl>
          <dl class="overview-business-summary">
            <div
              v-for="key in ['billingHouseCount', 'owingHouseCount', 'overdueHouseCount'] as const"
              :key="key"
            >
              <dt>{{ t('Overview.' + key) }}</dt>
              <dd>
                {{ data.receivables[key]?.toLocaleString() ?? '—' }}
                <small>{{ t('Overview.rooms') }}</small>
              </dd>
            </div>
            <div>
              <dt>{{ t('Report.remissionAmount') }}</dt>
              <dd>
                {{ overviewMoney(data.receivables.summary.remissionAmount) }}
                <small>{{ t('Overview.wan') }}</small>
              </dd>
            </div>
          </dl>
          <OverviewCharts
            :data="data"
            :start="dateStart"
            :end="dateEnd"
          />
          <section class="overview-panel">
            <div class="overview-panel-heading">
              <h3>{{ t('Overview.handover') }}</h3>
              <span>{{ t('Overview.currentWan') }}</span>
            </div>
            <dl class="overview-handovers">
              <div
                v-for="key in handoverKeys"
                :key="key"
                :class="key"
              >
                <dt>
                  <span class="overview-dot" />
                  {{ t('Overview.' + key) }}
                </dt>
                <dd>
                  {{ overviewMoney(data.handover[key]) }}
                  <small>{{ t('Overview.wan') }}</small>
                </dd>
              </div>
            </dl>
          </section>
        </template>
        <div
          v-else
          class="overview-placeholder"
        >
          <CloudEmpty
            :description="t(failed ? 'Overview.failed' : loading ? 'Overview.loading' : 'Overview.chooseProjects')"
          />
          <a-button
            v-if="failed"
            @click="state.load"
          >
            {{ t('Overview.retry') }}
          </a-button>
          <a-button
            v-else-if="!loading"
            type="primary"
            @click="projects.choose"
          >
            {{ t('ProjectContext.choose') }}
          </a-button>
        </div>
      </a-spin>
    </div>
  </FinancePage>
</template>
