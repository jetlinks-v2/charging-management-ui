<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import dayjs from 'dayjs'
import type { CarryRun, CarryWork } from '../../../api/financeCarry'
import { useCarryHistory } from '../../../hooks/finance-carry/useCarryHistory'
const props = defineProps<{ projectId: string; planId: string }>()
const { t, te } = useI18n()
const {
  table,
  run,
  work,
  loading,
  failed,
  retrying,
  status,
  level,
  params,
  request,
  selectRun,
  selectWork,
  back,
  retry,
  reloadDetail,
  notify
} = useCarryHistory(props)
defineExpose({ retrying })
const errorText = (code?: string) =>
  !code
    ? '—'
    : te('Carry.errors.' + code.replace(/^error\.property_finance_/, ''))
      ? t('Carry.errors.' + code.replace(/^error\.property_finance_/, ''))
      : t('Carry.failedHint')
const time = (value?: number) => (value ? dayjs(value).format('YYYY-MM-DD HH:mm:ss') : '—')
const color = (value: string) =>
  ({ SUCCEEDED: 'green', FAILED: 'red', PARTIAL: 'orange', RUNNING: 'blue', PENDING: 'blue' })[value]
const columns = computed(() =>
  level.value === 'runs'
    ? [
        { title: t('Carry.result'), dataIndex: 'status', scopedSlots: true, width: 120 },
        { title: t('Carry.slot'), dataIndex: 'slot', width: 200 },
        ...['succeeded', 'failed', 'skipped'].map((key) => ({ title: t('Carry.' + key), dataIndex: key, width: 100 })),
        { title: t('Carry.attempts'), dataIndex: 'attempts', width: 100 },
        { title: t('Finance.actions'), dataIndex: 'actions', scopedSlots: true, fixed: 'right', width: 200 }
      ]
    : level.value === 'works'
      ? [
          { title: t('Carry.result'), dataIndex: 'status', scopedSlots: true, width: 110 },
          { title: t('Setting.house'), dataIndex: 'fullName', width: 250 },
          { title: t('Carry.attempts'), dataIndex: 'attempts', width: 100 },
          { title: t('Carry.finishTime'), dataIndex: 'finishTime', scopedSlots: true, width: 190 },
          { title: t('Carry.reason'), dataIndex: 'errorCode', scopedSlots: true, width: 250 },
          { title: t('Finance.actions'), dataIndex: 'actions', scopedSlots: true, fixed: 'right', width: 120 }
        ]
      : [
          { title: t('Carry.result'), dataIndex: 'status', scopedSlots: true, width: 110 },
          { title: t('Carry.amount'), dataIndex: 'amount', width: 200, align: 'right', className: 'carry-money' },
          {
            title: t('Carry.feeReduction'),
            dataIndex: 'feeReduction',
            width: 160,
            align: 'right',
            className: 'carry-money'
          },
          {
            title: t('Carry.lateFeeReduction'),
            dataIndex: 'lateFeeReduction',
            width: 160,
            align: 'right',
            className: 'carry-money'
          },
          { title: t('Carry.paymentId'), dataIndex: 'paymentId', scopedSlots: true, width: 260 },
          { title: t('Carry.reason'), dataIndex: 'reason', scopedSlots: true, width: 200 }
        ]
)
const statuses = computed(() =>
  (level.value === 'runs'
    ? ['PENDING', 'RUNNING', 'SUCCEEDED', 'PARTIAL', 'CANCELLED']
    : ['PENDING', 'SUCCEEDED', 'FAILED', 'SKIPPED']
  ).map((value) => ({ value, label: t('Carry.' + value) }))
)
function inspect(row: CarryRun | CarryWork) {
  if (level.value === 'runs') void selectRun(row as CarryRun)
  else void selectWork(row as CarryWork)
}
</script>
<template>
  <div class="carry-history">
    <div class="carry-history-toolbar">
      <a-button
        v-if="level !== 'runs' || failed"
        :disabled="retrying"
        @click="back"
      >
        <AIcon type="ArrowLeftOutlined" />
        {{ t('Carry.back') }}
      </a-button>
      <strong>{{ t('Carry.' + level) }}</strong>
      <a-space>
        <a-select
          v-if="level !== 'items'"
          v-model:value="status"
          allow-clear
          :placeholder="t('Carry.allResults')"
          :options="statuses"
          :aria-label="t('Carry.result')"
          class="carry-status-filter"
        />
        <a-button
          :disabled="loading || retrying"
          :aria-label="t('Finance.refresh')"
          @click="table?.reload()"
        >
          <AIcon type="ReloadOutlined" />
        </a-button>
      </a-space>
    </div>
    <a-skeleton
      v-if="loading"
      active
      :paragraph="{ rows: 8 }"
    />
    <CloudEmpty
      v-else-if="failed"
      :description="t('Finance.detailFailed')"
    >
      <a-button @click="reloadDetail">{{ t('Finance.retry') }}</a-button>
    </CloudEmpty>
    <template v-else>
      <SectionCard
        v-if="run"
        icon="HistoryOutlined"
        :title="t('Carry.runInfo')"
      >
        <KvGrid
          :cols="2"
          :items="[
            { label: t('Carry.slot'), value: run.slot.replace('T', ' ') },
            { label: t('Carry.result'), value: t('Carry.' + run.status) },
            { label: t('Carry.businessDate'), value: run.businessDate },
            { label: t('Carry.planVersion'), value: String(run.planVersion) },
            { label: t('Carry.finishTime'), value: time(run.finishTime) },
            { label: t('Carry.reason'), value: errorText(run.errorCode) }
          ]"
        />
      </SectionCard>
      <SectionCard
        v-if="work"
        icon="HomeOutlined"
        :title="work.fullName"
      >
        <KvGrid
          :cols="2"
          :items="[
            { label: t('Carry.result'), value: t('Carry.' + work.status) },
            { label: t('Carry.attempts'), value: String(work.attempts) },
            { label: t('Carry.finishTime'), value: time(work.finishTime) },
            { label: t('Carry.reason'), value: errorText(work.errorCode) }
          ]"
        />
      </SectionCard>
      <j-pro-table
        :key="level"
        ref="table"
        row-key="id"
        type="PAGE"
        mode="TABLE"
        :columns="columns"
        :params="params"
        :request="request"
        :pagination="{ pageSize: 8 }"
        :no-pagination="false"
        :alert-show="false"
        :body-style="{ padding: 0 }"
        :scroll="{ x: level === 'items' ? 1090 : level === 'works' ? 1020 : 930 }"
        @request-error="notify"
      >
        <template #status="row">
          <a-tag :color="color(row.status)">{{ t('Carry.' + row.status) }}</a-tag>
        </template>
        <template #finishTime="row">{{ time(row.finishTime) }}</template>
        <template #errorCode="row">{{ errorText(row.errorCode) }}</template>
        <template #reason="row">
          {{ row.reason === 'INSUFFICIENT_BALANCE' ? t('Carry.noBalance') : row.reason ? t('Carry.failedHint') : '—' }}
        </template>
        <template #paymentId="row">{{ row.paymentId || t('Carry.noPayment') }}</template>
        <template #actions="row">
          <a-button
            type="link"
            :disabled="retrying"
            @click="inspect(row)"
          >
            {{ t(level === 'runs' ? 'Carry.viewWorks' : 'Carry.viewItems') }}
          </a-button>
          <a-popconfirm
            v-if="level === 'runs' && row.status === 'PARTIAL'"
            :title="t('Carry.retryConfirm')"
            @confirm="retry(row)"
          >
            <j-permission-button
              type="link"
              hasPermission="charging/FinanceCarry:retry"
              :loading="retrying"
              :disabled="retrying"
            >
              {{ t('Carry.retry') }}
            </j-permission-button>
          </a-popconfirm>
        </template>
        <template #emptyText>
          <CloudEmpty :description="t('Carry.' + (level === 'runs' ? 'emptyRuns' : 'emptyWorks'))" />
        </template>
      </j-pro-table>
    </template>
  </div>
</template>
<style scoped>
.carry-history {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  min-width: 0;
  gap: 20px;
}
.carry-history-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
.carry-history-toolbar > .ant-space {
  margin-left: auto;
}
.carry-status-filter {
  width: 150px;
}
:deep(.carry-money) {
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}
@media (max-width: 500px) {
  .carry-history-toolbar > .ant-space {
    margin-left: 0;
  }
}
</style>
