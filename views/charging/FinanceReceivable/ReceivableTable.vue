<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import ConditionFilter, { type ConditionFilterChangePayload } from '@jetlinks-web-core/components/ConditionFilter'
import type { Query } from '../../../api/archive'
import type { Receivable, ReceivableAction } from '../../../api/financeReceivable'
import {
  receivablePermission,
  type useReceivableWorkspace
} from '../../../hooks/finance-receivable/useReceivableWorkspace'
const props = defineProps<{ state: ReturnType<typeof useReceivableWorkspace> }>()
const { t } = useI18n()
const { archive, table, terms, params, status, request, select, actionTarget, notify } = props.state
const columns = computed(() => [
  { title: t('Setting.house'), dataIndex: 'fullName', width: 210, scopedSlots: true },
  { title: t('Setting.state'), dataIndex: 'state', width: 110, scopedSlots: true },
  { title: t('Setting.subject'), dataIndex: 'subjectName', width: 150, scopedSlots: true },
  { title: t('Receivable.coverage'), dataIndex: 'coverage', width: 140, scopedSlots: true },
  ...['actualReceivableAmount', 'paidAmount', 'arrears'].map((key) => ({
    title: t('Receivable.' + key),
    dataIndex: key,
    width: 115,
    align: 'right',
    scopedSlots: true
  })),
  { title: t('Finance.actions'), dataIndex: 'actions', width: 110, fixed: 'right', scopedSlots: true }
])
const fields = computed(() =>
  ['fullName', 'subjectName', 'customerName', 'standardName'].map((key) => ({
    title: t('Receivable.' + key),
    dataIndex: key,
    search: { type: 'string' }
  }))
)
const filter = ({ filter }: ConditionFilterChangePayload) => {
  terms.value = (filter.terms || []) as Query['terms']
}
const actions = (row: Receivable) =>
  (['FREEZE', 'UNFREEZE', 'DELETE'] as ReceivableAction[]).filter((action) => row.allowedOperations.includes(action))
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
  <ConditionFilter
    :columns="fields"
    @change="filter"
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
    :scroll="{ x: 1065 }"
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
      <small class="receivable-secondary">{{ row.customerName }}</small>
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
      <a-space :size="0">
        <a-button
          type="link"
          size="small"
          @click="select(row)"
        >
          {{ t('Finance.detail') }}
        </a-button>
        <a-dropdown
          v-if="actions(row).length"
          :trigger="['click']"
        >
          <a-button
            type="text"
            size="small"
            :aria-label="t('Setting.more')"
          >
            <AIcon type="MoreOutlined" />
          </a-button>
          <template #overlay>
            <a-menu>
              <a-menu-item
                v-for="action in actions(row)"
                :key="action"
              >
                <j-permission-button
                  type="text"
                  :danger="action === 'DELETE'"
                  :hasPermission="`${receivablePermission}:${action === 'DELETE' ? 'delete' : 'freeze'}`"
                  @click="actionTarget = { row, action }"
                >
                  {{ t('Receivable.operation.' + action) }}
                </j-permission-button>
              </a-menu-item>
            </a-menu>
          </template>
        </a-dropdown>
      </a-space>
    </template>
    <template #emptyText><CloudEmpty :description="t('Receivable.empty')" /></template>
  </j-pro-table>
</template>
<style scoped>
.receivable-status {
  margin-bottom: 16px;
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
