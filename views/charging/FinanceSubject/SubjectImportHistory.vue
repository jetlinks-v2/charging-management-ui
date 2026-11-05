<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSubjectImportHistory } from '../../../hooks/finance-subject/useSubjectImportHistory'
const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: [] }>()
const { t } = useI18n()
const { table, params, request, notify, failure } = useSubjectImportHistory(props)
const columns = computed(() => [
  { title: t('Subject.importStatus'), dataIndex: 'status', width: 100, scopedSlots: true },
  { title: t('Subject.fileName'), dataIndex: 'fileName', width: 230, ellipsis: true },
  { title: t('Subject.totalRows'), dataIndex: 'totalCount', width: 90, scopedSlots: true },
  { title: t('Subject.successRows'), dataIndex: 'successCount', width: 90 },
  { title: t('Subject.importedBy'), dataIndex: 'modifierName', width: 110 },
  { title: t('Subject.importTime'), dataIndex: 'createTime', width: 170, scopedSlots: true },
  { title: t('Subject.finishTime'), dataIndex: 'finishTime', width: 170, scopedSlots: true },
  { title: t('Finance.actions'), dataIndex: 'actions', width: 100, fixed: 'right', scopedSlots: true }
])
const format = (value?: number) => (value ? new Date(value).toLocaleString() : '—')
</script>
<template>
  <JlDrawerShell
    :open="open"
    :width="1100"
    icon="HistoryOutlined"
    :title="t('Subject.importHistory')"
    @update:open="emit('close')"
  >
    <div class="finance-toolbar">
      <a-button @click="table?.reload()">
        <AIcon type="ReloadOutlined" />
        {{ t('Finance.refresh') }}
      </a-button>
    </div>
    <j-pro-table
      ref="table"
      row-key="id"
      mode="TABLE"
      type="PAGE"
      :columns="columns"
      :params="params"
      :request="request"
      :no-pagination="false"
      :pagination="{ pageSize: 12 }"
      :scroll="{ x: 1060 }"
      :alert-show="false"
      @request-error="notify"
    >
      <template #status="row">
        <a-tag :color="row.status === 'SUCCESS' ? 'success' : row.status === 'FAILED' ? 'error' : 'processing'">
          {{ t('Subject.importState.' + row.status) }}
        </a-tag>
      </template>
      <template #totalCount="row">{{ row.totalCount ?? '—' }}</template>
      <template #createTime="row">{{ format(row.createTime) }}</template>
      <template #finishTime="row">{{ format(row.finishTime) }}</template>
      <template #actions="row">
        <a-button
          v-if="row.status === 'FAILED'"
          type="link"
          danger
          @click="failure(row)"
        >
          {{ t('Subject.failureDetails') }}
        </a-button>
      </template>
      <template #emptyText><CloudEmpty :description="t('Subject.noImportHistory')" /></template>
    </j-pro-table>
  </JlDrawerShell>
</template>
<style src="../finance.css"></style>
