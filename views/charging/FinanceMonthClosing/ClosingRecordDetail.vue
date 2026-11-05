<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { onlyMessage } from '@jetlinks-web/utils'
import { requestErrorMessage } from '../../../utils/requestError'
import type { Query } from '../../../api/archive'
import { queryClosingMembers, type ClosingLog } from '../../../api/financeAccounting'
const props = defineProps<{ projectId: string; record: ClosingLog }>()
const emit = defineEmits<{ close: [] }>()
const { t } = useI18n()
const notify = (e: unknown) => onlyMessage(requestErrorMessage(e, t('Finance.failed')), 'error')
const request = (q: Query, config?: { signal: AbortSignal }) =>
  queryClosingMembers(props.projectId, props.record.operation.id, q, config?.signal)
const columns = computed(() => [
  { title: t('MonthClosing.sourceType'), dataIndex: 'sourceType', scopedSlots: true, width: 120 },
  { title: t('MonthClosing.sourceReference'), dataIndex: 'sourceId', key: 'source', ellipsis: true },
  { title: t('MonthClosing.sourceVersion'), dataIndex: 'sourceVersion', width: 100 }
])
</script>
<template>
  <JlDrawerShell
    :open="true"
    :width="760"
    icon="HistoryOutlined"
    :title="record.operation.accountMonth + ' · ' + t('MonthClosing.action.' + record.operation.action)"
    @update:open="emit('close')"
  >
    <KvGrid
      :cols="2"
      :items="[
        { label: t('MonthClosing.amount'), value: '￥' + record.result.amount },
        { label: t('MonthClosing.cashAmount'), value: '￥' + record.result.cashAmount },
        { label: t('MonthClosing.operator'), value: record.operation.modifierName || '—' },
        { label: t('MonthClosing.sourceCount'), value: record.result.sourceCount }
      ]"
    />
    <a-descriptions
      :column="1"
      size="small"
      class="record-reason"
    >
      <a-descriptions-item :label="t('MonthClosing.reason')">{{ record.operation.reason }}</a-descriptions-item>
    </a-descriptions>
    <h3>{{ t('MonthClosing.members') }}</h3>
    <j-pro-table
      :request="request"
      :no-pagination="false"
      :pagination="{ pageSize: 12 }"
      @request-error="notify"
      :columns="columns"
      row-key="id"
      mode="TABLE"
      :scroll="{ x: 550 }"
    >
      <template #sourceType="member">{{ t('MonthClosing.sourceTypes.' + member.sourceType) }}</template>
      <template #emptyText><CloudEmpty :description="t('MonthClosing.noMembers')" /></template>
    </j-pro-table>
  </JlDrawerShell>
</template>
<style scoped>
.record-reason {
  margin: 20px 0;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
</style>
