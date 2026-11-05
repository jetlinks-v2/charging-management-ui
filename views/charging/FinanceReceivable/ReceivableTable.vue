<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import ConditionFilter, { type ConditionFilterChangePayload } from '@jetlinks-web-core/components/ConditionFilter'
import type { Query } from '../../../api/archive'
import type { Receivable, ReceivableAction } from '../../../api/financeReceivable'
import {
  receivablePermission,
  type useReceivableWorkspace
} from '../../../hooks/finance-receivable/useReceivableWorkspace'
import ReceivableBatchActions from './ReceivableBatchActions.vue'
import ReceivableColumnSettings from './ReceivableColumnSettings.vue'
import ReceivableRowActions from './ReceivableRowActions.vue'
import ReceivableReview from './ReceivableReview.vue'
import { useReceivableColumns } from '../../../hooks/finance-receivable/useReceivableColumns'
import { receivableFields } from '../../../utils/receivableFields'
const props = defineProps<{ state: ReturnType<typeof useReceivableWorkspace>; cashier?: boolean }>()
const { t } = useI18n()
const { archive, table, terms, params, status, request, select, actionTarget, notify } = props.state
const columnState = useReceivableColumns()
const { columns, scrollWidth } = columnState
const review = ref<InstanceType<typeof ReceivableReview>>(),
  reviewBlocked = ref(false)
const fields = computed(() => receivableFields(t))
const filter = ({ filter }: ConditionFilterChangePayload) => {
  terms.value = (filter.terms || []) as Query['terms']
}
const selection = computed(() => ({
  selectedRowKeys: props.state.batch.selected.value.map((row) => row.id),
  onChange: (_keys: string[], rows: Receivable[]) => {
    props.state.batch.selected.value = rows
  },
  preserveSelectedRowKeys: false
}))
</script>
<template>
  <a-radio-group
    v-model:value="status"
    class="receivable-status"
    :aria-label="t('Setting.state')"
  >
    <a-radio-button
      v-for="key in ['ALL', 'OPEN', 'CLOSED', 'FROZEN']"
      :key="key"
      :value="key"
    >
      {{ t('Receivable.status.' + key) }}
    </a-radio-button>
  </a-radio-group>
  <div class="receivable-filterbar">
    <ConditionFilter
      :fields="fields"
      @change="filter"
    />
    <ReceivableColumnSettings :state="columnState" />
  </div>
  <ReceivableBatchActions
    v-if="!cashier && !reviewBlocked"
    :state="state.batch"
  />
  <ReceivableReview
    v-if="!cashier"
    ref="review"
    :project-id="archive.projectId.value"
    :selected="state.batch.selected.value"
    @lock="reviewBlocked = $event"
    @saved="state.reload()"
  />
  <j-pro-table
    v-if="archive.projectId.value"
    ref="table"
    row-key="id"
    type="PAGE"
    mode="TABLE"
    :columns="columns"
    :params="params"
    :request="request"
    :no-pagination="false"
    :pagination="{ pageSize: 12 }"
    :alert-show="false"
    :body-style="{ padding: 0 }"
    :scroll="{ x: scrollWidth }"
    :row-selection="selection"
    @request-error="notify"
  >
    <template #fullName="row">
      <a-button
        type="link"
        class="receivable-house"
        @click="select(row)"
      >
        {{ row.fullName }}
      </a-button>
    </template>
    <template #subjectName="row">
      {{ row.subjectName }}
      <small class="receivable-secondary">{{ row.customerNames?.join('、') || row.customerName }}</small>
    </template>
    <template #coverage="row">
      <span class="receivable-date">{{ row.calcStartDate }}</span>
      <small class="receivable-secondary receivable-date">～ {{ row.calcEndDate }}</small>
    </template>
    <template #actualReceivableAmount="row">
      <span class="receivable-money">{{ row.actualReceivableAmount }}</span>
    </template>
    <template #paidAmount="row">
      <span class="receivable-money">{{ row.paidAmount }}</span>
    </template>
    <template #arrears="row">
      <strong class="receivable-money">{{ row.arrears }}</strong>
    </template>
    <template #state="row">
      <a-tag :color="row.reviewState === 'APPROVED' ? 'green' : row.reviewState === 'REJECTED' ? 'red' : 'default'">
        {{ t('ReceivableReview.state.' + (row.reviewState || 'PENDING')) }}
      </a-tag>
      <a-tag :color="row.frozen ? 'warning' : row.periodStatus === 'CLOSED' ? 'default' : 'processing'">
        {{ t('Receivable.status.' + (row.frozen ? 'FROZEN' : row.periodStatus)) }}
      </a-tag>
      <small
        v-if="row.financialClosed"
        class="receivable-secondary"
      >
        {{ t('Receivable.financialClosed') }}
      </small>
    </template>
    <template #actions="row">
      <ReceivableRowActions
        :row="row"
        :readonly="cashier || reviewBlocked"
        @select="(mode) => select(row, mode)"
        @action="(action) => (actionTarget = { row, action })"
        @review="(action) => review?.start([row], action)"
      />
    </template>
    <template #emptyText><CloudEmpty :description="t('Receivable.empty')" /></template>
  </j-pro-table>
  <div
    v-if="state.pageRows.value.length"
    class="receivable-totals"
  >
    <strong>{{ t('Receivable.pageTotal') }}</strong>
    <span
      v-for="key in ['actualReceivableAmount', 'paidAmount', 'arrears']"
      :key="key"
    >
      {{ t('Receivable.' + key) }}
      <b>{{ state.totals.value[key] }}</b>
    </span>
  </div>
</template>
<style scoped>
.receivable-status {
  margin-bottom: 16px;
}
.receivable-filterbar {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 16px;
}
.receivable-filterbar > :first-child {
  flex: 1;
  min-width: 0;
}
.receivable-totals {
  display: flex;
  justify-content: flex-end;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 14px 24px;
  padding: 14px 8px;
  font-size: 13px;
}
.receivable-totals b {
  margin-left: 8px;
  font-variant-numeric: tabular-nums;
}
.receivable-house {
  padding: 0;
  height: auto;
  max-width: 100%;
  white-space: normal;
  text-align: left;
}
.receivable-money {
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.receivable-date {
  white-space: nowrap;
}
.receivable-secondary {
  display: block;
  color: var(--ant-color-text-secondary, #595959);
  margin-top: 4px;
}
</style>
