<script setup lang="ts">
import { formatFinanceTime } from '../../../utils/financeTime'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { onlyMessage } from '@jetlinks-web/utils'
import { requestErrorMessage } from '../../../utils/requestError'
import type { Query } from '../../../api/archive'
import { queryAutomaticClosingRuns, type AutomaticClosingRun } from '../../../api/financeAccounting'
const props = defineProps<{ projectId: string }>()
const { t } = useI18n()
const params = computed(() => ({ projectId: props.projectId }))
const request = (q: Query, config?: { signal: AbortSignal }) =>
  queryAutomaticClosingRuns(props.projectId, q, config?.signal)
const notify = (e: unknown) => onlyMessage(requestErrorMessage(e, t('Finance.failed')), 'error')
const columns = computed(() => [
  { title: t('MonthClosing.auto.result'), dataIndex: 'status', scopedSlots: true, width: 110 },
  { title: t('MonthClosing.auto.month'), dataIndex: 'accountMonth', width: 120 },
  { title: t('MonthClosing.operationTime'), dataIndex: 'time', scopedSlots: true, width: 180 },
  { title: t('MonthClosing.operator'), dataIndex: 'modifierName', width: 120 },
  { title: t('MonthClosing.auto.feedback'), dataIndex: 'feedback', scopedSlots: true, width: 280 }
])
// 仅显示受控业务码的译文；未知数据库/网络异常由后端归一化，不泄露原始异常。
const feedback = (row: AutomaticClosingRun) =>
  row.status === 'SUCCEEDED'
    ? t('MonthClosing.auto.closed')
    : t(
        'MonthClosing.auto.errors.' +
          (row.errorCode?.replace('error.property_finance_', '') || 'month_schedule_failed'),
        t('MonthClosing.auto.failedHint')
      )
</script>
<template>
  <j-pro-table
    :columns="columns"
    :request="request"
    :params="params"
    row-key="id"
    :no-pagination="false"
    :pagination="{ pageSize: 12 }"
    :scroll="{ x: 810 }"
    mode="TABLE"
    @request-error="notify"
  >
    <template #status="record">
      <a-tag :color="record.status === 'SUCCEEDED' ? 'green' : 'red'">
        {{ t('MonthClosing.auto.status.' + record.status) }}
      </a-tag>
    </template>
    <template #time="record">{{ formatFinanceTime(record.createTime) }}</template>
    <template #feedback="record">{{ feedback(record) }}</template>
    <template #emptyText><CloudEmpty :description="t('MonthClosing.auto.noRuns')" /></template>
  </j-pro-table>
</template>
