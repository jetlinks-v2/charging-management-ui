<script setup lang="ts">
import { computed, ref } from 'vue'
import dayjs from 'dayjs'
import { useI18n } from 'vue-i18n'
import { onlyMessage } from '@jetlinks-web/utils'
import { requestErrorMessage } from '../../../utils/requestError'
import type { Query } from '../../../api/archive'
import { queryClosingLogs, type ClosingLog } from '../../../api/financeAccounting'
import ClosingRecordDetail from './ClosingRecordDetail.vue'
const props = defineProps<{ projectId: string; month: string }>()
const { t } = useI18n(),
  detail = ref<ClosingLog>()
const params = computed(() => ({ projectId: props.projectId, month: props.month }))
const request = (q: Query, config?: { signal: AbortSignal }) =>
  queryClosingLogs(props.projectId, props.month, q, config?.signal)
const rowKey = (row: ClosingLog) => row.operation.id
const notify = (e: unknown) => onlyMessage(requestErrorMessage(e, t('Finance.failed')), 'error')
const columns = computed(() => [
  { title: t('MonthClosing.actionTitle'), dataIndex: 'action', scopedSlots: true, width: 120 },
  { title: t('MonthClosing.operator'), dataIndex: ['operation', 'modifierName'], key: 'operator', width: 120 },
  { title: t('MonthClosing.operationTime'), dataIndex: 'time', scopedSlots: true, width: 180 },
  { title: t('MonthClosing.reason'), dataIndex: ['operation', 'reason'], key: 'reason', ellipsis: true },
  { title: t('Finance.actions'), dataIndex: 'actions', scopedSlots: true, width: 90 }
])
</script>
<template>
  <j-pro-table
    :key="projectId + month"
    :columns="columns"
    :request="request"
    :params="params"
    :row-key="rowKey"
    :no-pagination="false"
    :pagination="{ pageSize: 12 }"
    @request-error="notify"
    mode="TABLE"
    :scroll="{ x: 720 }"
  >
    <template #action="record">
      <a-tag :color="record.operation.action === 'CLOSE' ? 'green' : 'orange'">
        {{ t('MonthClosing.action.' + record.operation.action) }}
      </a-tag>
    </template>
    <template #time="record">
      {{ dayjs(record.operation.createTime).format('YYYY-MM-DD HH:mm:ss') }}
    </template>
    <template #actions="record">
      <a-button
        type="link"
        @click="detail = record"
      >
        {{ t('Finance.detail') }}
      </a-button>
    </template>
    <template #emptyText><CloudEmpty :description="t('MonthClosing.noLogs')" /></template>
  </j-pro-table>
  <ClosingRecordDetail
    v-if="detail"
    :project-id="projectId"
    :record="detail"
    @close="detail = undefined"
  />
</template>
