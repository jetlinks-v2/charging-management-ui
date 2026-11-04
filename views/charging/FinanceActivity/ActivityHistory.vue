<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import dayjs from 'dayjs'
import { onlyMessage } from '@jetlinks-web/utils'
import { queryActivityLogs } from '../../../api/financeActivity'
import type { Query } from '../../../api/archive'
import { requestErrorMessage } from '../../../utils/requestError'
const props = defineProps<{ projectId: string; id: string }>()
const { t, te } = useI18n()
const columns = computed(() => [
  { title: t('Activity.operation'), dataIndex: 'operation', scopedSlots: true },
  { title: t('Activity.operator'), dataIndex: 'operatorName' },
  { title: t('Activity.time'), dataIndex: 'createTime', scopedSlots: true }
])
const params = computed(() => ({
  project: props.projectId,
  activity: props.id,
  sorts: [{ name: 'createTime', order: 'desc' }]
}))
const request = (query: Query, config?: { signal?: AbortSignal }) =>
  queryActivityLogs(props.projectId, props.id, query, config?.signal)
const notify = (e: unknown) => onlyMessage(requestErrorMessage(e, t('Finance.failed')), 'error')
</script>
<template>
  <j-pro-table
    row-key="id"
    type="PAGE"
    mode="TABLE"
    :columns="columns"
    :params="params"
    :request="request"
    :pagination="{ pageSize: 12 }"
    :no-pagination="false"
    :alert-show="false"
    :body-style="{ padding: 0 }"
    :scroll="{ x: 500 }"
    @request-error="notify"
  >
    <template #operation="row">
      {{ te('Activity.' + row.operation) ? t('Activity.' + row.operation) : t('Activity.operation') }}
    </template>
    <template #createTime="row">{{ dayjs(row.createTime).format('YYYY-MM-DD HH:mm:ss') }}</template>
    <template #emptyText><CloudEmpty :description="t('Activity.emptyLogs')" /></template>
  </j-pro-table>
</template>
