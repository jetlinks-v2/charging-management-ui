<script setup lang="ts">
import { computed } from 'vue'
import { Grid } from 'ant-design-vue'
import type { HandoverRecord } from '../../../api/financeHandover'
import type { useHandoverWorkspace } from '../../../hooks/finance-handover/useHandoverWorkspace'
const props = defineProps<{ state: ReturnType<typeof useHandoverWorkspace>; selected: HandoverRecord[] }>()
const emit = defineEmits<{ selection: [rows: HandoverRecord[]] }>()
const { t, projectId, blocked, params, request, table, notify, select, act } = props.state
const screens = Grid.useBreakpoint()
const recordSelection = computed(() => ({
  selectedRowKeys: props.selected.map((row) => row.id),
  preserveSelectedRowKeys: true,
  onChange: (_keys: unknown, rows: HandoverRecord[]) => emit('selection', rows.slice(0, 100)),
  getCheckboxProps: (row: HandoverRecord) => ({ disabled: blocked.value || row.monthClosed })
}))
const columns = computed(() => [
  { title: t('FinanceHandover.handoverNo'), dataIndex: 'handoverNo', width: 230 },
  { title: t('FinanceHandover.state'), dataIndex: 'status', width: 120, scopedSlots: true },
  { title: t('FinanceHandover.date'), dataIndex: 'closingDate', width: 120 },
  { title: t('FinanceHandover.lineCount'), dataIndex: 'lineCount', width: 100 },
  { title: t('FinanceHandover.sourceCount'), dataIndex: 'sourceCount', width: 100 },
  { title: t('FinanceHandover.occurredStart'), dataIndex: 'occurredStart', width: 180 },
  { title: t('FinanceHandover.occurredEnd'), dataIndex: 'occurredEnd', width: 180 },
  { title: t('FinanceHandover.calcStartDate'), dataIndex: 'calcStartDate', width: 120 },
  { title: t('FinanceHandover.calcEndDate'), dataIndex: 'calcEndDate', width: 120 },
  { title: t('FinanceHandover.amount'), dataIndex: 'amount', width: 130, align: 'right' },
  { title: t('FinanceHandover.cash'), dataIndex: 'cashAmount', width: 130, align: 'right' },
  { title: t('FinanceHandover.submitter'), dataIndex: 'submittedBy', width: 130 },
  { title: t('FinanceHandover.submittedAt'), dataIndex: 'submittedAt', width: 180, scopedSlots: true },
  {
    title: t('Finance.actions'),
    dataIndex: 'actions',
    width: 290,
    fixed: screens.value.md ? 'right' : undefined,
    scopedSlots: true
  }
])
</script>
<template>
  <j-pro-table
    ref="table"
    row-key="id"
    type="PAGE"
    mode="TABLE"
    :columns="columns"
    :row-selection="recordSelection"
    :params="params"
    :request="request"
    :no-pagination="false"
    :pagination="{ pageSize: 12 }"
    :alert-show="false"
    :body-style="{ padding: 0 }"
    :scroll="{ x: 1900 }"
    @request-error="notify"
  >
    <template #status="row">
      <a-tag :color="row.status === 'APPROVED' ? 'success' : row.status === 'PENDING' ? 'processing' : 'default'">
        {{ t('FinanceHandover.status.' + row.status) }}
      </a-tag>
    </template>
    <template #submittedAt="row">{{ row.submittedAt.replace('T', ' ') }}</template>
    <template #actions="row">
      <a-space>
        <a-button
          type="link"
          @click="select(row.id)"
        >
          {{ t('Finance.detail') }}
        </a-button>
        <j-permission-button
          v-if="row.status === 'PENDING' && !row.monthClosed"
          type="link"
          hasPermission="charging/FinanceHandoverRecord:approve"
          :disabled="blocked"
          @click="act(row, 'APPROVE')"
        >
          {{ t('FinanceHandover.action.APPROVE') }}
        </j-permission-button>
        <a-dropdown
          v-if="!row.monthClosed && (row.status === 'PENDING' || row.status === 'APPROVED')"
          :disabled="blocked"
        >
          <a-button type="link">{{ t('FinanceHandover.more') }}</a-button>
          <template #overlay>
            <a-menu>
              <a-menu-item v-if="row.status === 'APPROVED'">
                <j-permission-button
                  type="text"
                  hasPermission="charging/FinanceHandoverRecord:unapprove"
                  @click="act(row, 'UNAPPROVE')"
                >
                  {{ t('FinanceHandover.action.UNAPPROVE') }}
                </j-permission-button>
              </a-menu-item>
              <template v-else>
                <a-menu-item>
                  <j-permission-button
                    type="text"
                    hasPermission="charging/FinanceHandoverRecord:reject"
                    @click="act(row, 'REJECT')"
                  >
                    {{ t('FinanceHandover.action.REJECT') }}
                  </j-permission-button>
                </a-menu-item>
                <a-menu-item>
                  <j-permission-button
                    type="text"
                    hasPermission="charging/FinanceHandoverRecord:cancel"
                    @click="act(row, 'CANCEL')"
                  >
                    {{ t('FinanceHandover.action.CANCEL') }}
                  </j-permission-button>
                </a-menu-item>
              </template>
            </a-menu>
          </template>
        </a-dropdown>
      </a-space>
    </template>
    <template #emptyText><CloudEmpty :description="t('FinanceHandover.noRecords')" /></template>
  </j-pro-table>
</template>
