<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import dayjs from 'dayjs'
import type { Receivable } from '../../../api/financeReceivable'
import { useReceivableLogs } from '../../../hooks/finance-receivable/useReceivableLogs'
import ReceivableLogChange from './ReceivableLogChange.vue'
const props = defineProps<{
  projectId: string
  detail?: Receivable
  loading: boolean
  failed: boolean
  initialTab?: string
}>()
const emit = defineEmits<{ close: []; source: [id: string] }>()
const { t } = useI18n()
const logs = useReceivableLogs(props)
const { rows, total, current, loading: logsLoading, failed: logsFailed, load } = logs
const amounts = (keys: (keyof Receivable)[]) =>
  keys.map((key) => ({ label: t('Receivable.' + key), value: String(props.detail?.[key] ?? '—') }))
const period = computed(() =>
  ['periodStart', 'periodEnd', 'calcStartDate', 'calcEndDate', 'dueDate', 'calculatedAsOfDate', 'accountPeriod'].map(
    (key) => ({
      label: t('Receivable.' + key),
      value: String(props.detail?.[key as keyof Receivable] || '—')
    })
  )
)
const identity = computed(() => [
  { label: t('Setting.house'), value: props.detail?.fullName },
  { label: t('Setting.customer'), value: props.detail?.customerNames?.join('、') || props.detail?.customerName },
  { label: t('Setting.telephone'), value: props.detail?.snapshot?.customer.telephone || '—' },
  { label: t('Setting.subject'), value: props.detail?.subjectName },
  { label: t('Setting.standard'), value: props.detail?.standardName },
  { label: t('Historical.contractCode'), value: props.detail?.contractCode || '—' },
  { label: t('Setting.remark'), value: props.detail?.remark || '—' }
])
const variables = computed(
  () =>
    props.detail?.snapshot?.standard.variablesSnapshot.map((row) => ({
      label: row.variableName,
      value:
        row.variableCode === 'PERIOD_MONTHS'
          ? t('Setting.periodCalculated')
          : props.detail?.snapshot?.values[row.variableCode] || '—'
    })) || []
)
</script>
<template>
  <JlDrawerShell
    :open="true"
    :width="840"
    icon="AccountBookOutlined"
    :title="t('Receivable.detail')"
    :sub="detail?.fullName"
    @update:open="emit('close')"
  >
    <a-skeleton
      v-if="loading"
      active
      :paragraph="{ rows: 12 }"
    />
    <CloudEmpty
      v-else-if="failed"
      :description="t('Finance.detailFailed')"
    />
    <div
      v-else-if="detail"
      class="receivable-detail"
    >
      <div class="receivable-detail-state">
        <a-tag
          :color="detail.reviewState === 'APPROVED' ? 'green' : detail.reviewState === 'REJECTED' ? 'red' : 'default'"
        >
          {{ t('ReceivableReview.state.' + (detail.reviewState || 'PENDING')) }}
        </a-tag>
        <a-tag :color="detail.frozen ? 'warning' : detail.periodStatus === 'OPEN' ? 'processing' : 'default'">
          {{ t('Receivable.status.' + (detail.frozen ? 'FROZEN' : detail.periodStatus)) }}
        </a-tag>
        <span>{{ t('Receivable.calculatedAsOfDate') }} {{ detail.calculatedAsOfDate }}</span>
      </div>
      <KvGrid
        v-if="detail.reviewedOn"
        :items="[
          { label: t('ReceivableReview.reviewedOn'), value: detail.reviewedOn },
          { label: t('ReceivableReview.reviewedName'), value: detail.reviewedName || '—' },
          { label: t('Receivable.reason'), value: detail.reviewReason || '—' }
        ]"
      />
      <a-button
        v-if="detail.sourceReceivableId"
        type="link"
        @click="emit('source', detail.sourceReceivableId)"
      >
        {{ t('Split.viewSource') }}
      </a-button>
      <a-tag v-if="detail.split">{{ t('Split.archived') }}</a-tag>
      <a-tag v-if="detail.sourceType === 'HISTORICAL_IMPORT'">{{ t('Historical.source') }}</a-tag>
      <a-tabs :default-active-key="initialTab || 'amount'">
        <a-tab-pane
          key="amount"
          :tab="t('Receivable.amounts')"
        >
          <div class="receivable-sections">
            <SectionCard
              icon="WalletOutlined"
              :title="t('Receivable.amounts')"
            >
              <KvGrid
                :items="
                  amounts([
                    'actualReceivableAmount',
                    'paidAmount',
                    'arrears',
                    'contractReceivableAmount',
                    'accruedReceivableAmount',
                    'finalLateFeeAmount'
                  ])
                "
                :gap="20"
              />
            </SectionCard>
            <SectionCard
              icon="ReconciliationOutlined"
              :title="t('Receivable.composition')"
            >
              <KvGrid
                :items="
                  amounts([
                    'adjustmentAmount',
                    'assessmentAmount',
                    'temporaryDispatchAmount',
                    'feeReductionAmount',
                    'accruedLateFeeAmount',
                    'lateFeeReductionAmount'
                  ])
                "
                :gap="20"
              />
            </SectionCard>
            <SectionCard
              icon="CalendarOutlined"
              :title="t('Receivable.period')"
            >
              <KvGrid
                :items="period"
                :gap="20"
              />
            </SectionCard>
            <SectionCard
              icon="HomeOutlined"
              :title="t('Setting.houseAndCustomer')"
            >
              <KvGrid
                :items="identity"
                :gap="20"
              />
            </SectionCard>
          </div>
        </a-tab-pane>
        <a-tab-pane
          key="rule"
          :tab="t('Receivable.rule')"
        >
          <SectionCard
            icon="FunctionOutlined"
            :title="t('Setting.formula')"
          >
            <p class="receivable-formula">{{ detail.snapshot?.standard.formulaDisplay }}</p>
            <KvGrid
              :items="variables"
              :gap="20"
            />
          </SectionCard>
        </a-tab-pane>
        <a-tab-pane
          key="logs"
          :tab="t('Receivable.logs')"
        >
          <a-spin :spinning="logsLoading">
            <a-timeline
              v-if="rows.length"
              class="receivable-timeline"
            >
              <a-timeline-item
                v-for="row in rows"
                :key="row.id"
              >
                <div class="receivable-log-heading">
                  <strong>{{ t('Receivable.operation.' + row.operation) }}</strong>
                  <time>{{ dayjs(row.createTime).format('YYYY-MM-DD HH:mm:ss') }}</time>
                </div>
                <p class="receivable-log-reason">{{ row.reason }}</p>
                <ReceivableLogChange :row="row" />
                <span class="receivable-log-operator">
                  {{ row.operatorName }} ·
                  {{ t('Receivable.versionChange', { before: row.beforeVersion, after: row.afterVersion }) }}
                </span>
              </a-timeline-item>
            </a-timeline>
            <CloudEmpty
              v-else-if="!logsLoading"
              :description="t(logsFailed ? 'Finance.detailFailed' : 'Receivable.noLogs')"
            />
          </a-spin>
          <div class="receivable-log-footer">
            <a-button
              v-if="logsFailed"
              @click="load(current)"
            >
              {{ t('Finance.refresh') }}
            </a-button>
            <a-pagination
              v-if="total"
              :current="current"
              :page-size="5"
              :total="total"
              size="small"
              :show-size-changer="false"
              @change="load"
            />
          </div>
        </a-tab-pane>
      </a-tabs>
    </div>
    <template #foot>
      <a-button @click="emit('close')">{{ t('Finance.close') }}</a-button>
    </template>
  </JlDrawerShell>
</template>
<style scoped>
.receivable-sections {
  display: flex;
  flex-direction: column;
  gap: 18px;
}
.receivable-detail-state {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  color: var(--ant-color-text-secondary, #595959);
}
.receivable-detail :deep(.kv-grid) {
  font-variant-numeric: tabular-nums;
}
.receivable-formula {
  margin: 0 0 20px;
  overflow-wrap: anywhere;
  line-height: 1.8;
}
.receivable-timeline {
  padding: 20px 4px 0;
}
.receivable-log-heading {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  justify-content: space-between;
}
.receivable-log-heading time,
.receivable-log-operator {
  color: var(--ant-color-text-secondary, #595959);
  font-size: 12px;
}
.receivable-log-reason {
  margin: 10px 0 6px;
  overflow-wrap: anywhere;
}
.receivable-log-footer {
  display: flex;
  justify-content: flex-end;
}
.receivable-detail :deep(.ant-spin-container) {
  min-height: 160px;
}
@media (max-width: 560px) {
  .receivable-detail :deep(.kv-grid) {
    grid-template-columns: 1fr !important;
  }
}
</style>
