<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { queryHandoverSources, type HandoverCandidate } from '../../../api/financeHandover'
import type { Query } from '../../../api/archive'
import type { useHandoverWorkspace } from '../../../hooks/finance-handover/useHandoverWorkspace'
const props = defineProps<{ state: ReturnType<typeof useHandoverWorkspace> }>()
const { t } = useI18n()
const { projectId, type, selected, blocked, changed, notify } = props.state
const params = computed(() => ({ projectId: projectId.value, sourceType: type.value }))
const request = (q: Query, config?: { signal: AbortSignal }) =>
  queryHandoverSources(projectId.value, type.value, q, config?.signal)
const columns = computed(() => [
  { title: t('Handover.occurredAt'), dataIndex: 'occurredAt', width: 180, scopedSlots: true },
  { title: t('Handover.customer'), dataIndex: 'customerName', width: 150 },
  { title: t('Handover.company'), dataIndex: 'companyName', width: 220 },
  { title: t('Handover.amount'), dataIndex: 'amount', width: 140, align: 'right', scopedSlots: true },
  { title: t('Handover.cash'), dataIndex: 'cashAmount', width: 140, align: 'right', scopedSlots: true },
  { title: t('Handover.lineCount'), dataIndex: 'lineCount', width: 120 }
])
const selection = computed(() => ({
  selectedRowKeys: selected.value.map((row) => row.id),
  preserveSelectedRowKeys: true,
  onChange: changed,
  getCheckboxProps: (_row: HandoverCandidate) => ({ disabled: blocked.value })
}))
</script>
<template>
  <j-pro-table
    v-if="projectId"
    :key="type + ':' + projectId"
    :ref="
      (v: unknown) => {
        state.table.value = v as { reload: () => void }
      }
    "
    row-key="id"
    type="PAGE"
    mode="TABLE"
    :columns="columns"
    :params="params"
    :request="request"
    :row-selection="selection"
    :no-pagination="false"
    :pagination="{ pageSize: 12 }"
    :alert-show="false"
    :body-style="{ padding: 0 }"
    :scroll="{ x: 950 }"
    @request-error="notify"
  >
    <template #occurredAt="row">{{ row.occurredAt.replace('T', ' ') }}</template>
    <template #amount="row">
      <span class="handover-money">{{ row.amount }}</span>
    </template>
    <template #cashAmount="row">
      <strong class="handover-money">{{ row.cashAmount }}</strong>
    </template>
    <template #emptyText><CloudEmpty :description="t('Handover.noSources')" /></template>
  </j-pro-table>
</template>
