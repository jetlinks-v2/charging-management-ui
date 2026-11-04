<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useTaxHistory } from '../../../hooks/finance-tax/useTaxHistory'
const props = defineProps<{ open: boolean; projectId: string; taxId?: string }>()
const emit = defineEmits<{ close: [] }>()
const { t } = useI18n()
const { table, params, request, failure, changes, notify } = useTaxHistory(props)
const columns = computed(() => [
  { title: t('FinanceTax.time'), dataIndex: 'createTime', width: 170, scopedSlots: true },
  { title: t('FinanceTax.operator'), dataIndex: 'modifierName', width: 120 },
  ...(props.taxId
    ? [
        { title: t('FinanceTax.operationLabel'), dataIndex: 'operation', width: 110, scopedSlots: true },
        { title: t('FinanceTax.changes'), dataIndex: 'changes', scopedSlots: true }
      ]
    : [
        { title: t('FinanceTax.fileName'), dataIndex: 'fileName', width: 220 },
        { title: t('FinanceTax.enabled'), dataIndex: 'status', width: 110, scopedSlots: true },
        { title: t('FinanceTax.count'), dataIndex: 'successCount', width: 80 },
        { title: t('Finance.actions'), dataIndex: 'actions', width: 110, scopedSlots: true }
      ])
])
</script>
<template>
  <JlDrawerShell
    :open="open"
    :width="900"
    icon="HistoryOutlined"
    :title="t('FinanceTax.' + (taxId ? 'operations' : 'importRecords'))"
    @update:open="emit('close')"
  >
    <j-pro-table
      v-if="open"
      ref="table"
      row-key="id"
      mode="TABLE"
      type="PAGE"
      :columns="columns"
      :params="params"
      :request="request"
      :pagination="{ pageSize: 10 }"
      :alert-show="false"
      :body-style="{ padding: 0 }"
      @request-error="notify"
    >
      <template #createTime="row">{{ new Date(row.createTime).toLocaleString() }}</template>
      <template #operation="row">{{ t('FinanceTax.operation.' + row.operation) }}</template>
      <template #changes="row">
        <span class="tax-change-text">{{ changes(row) }}</span>
      </template>
      <template #status="row">
        <a-tag :color="row.status === 'SUCCESS' ? 'success' : row.status === 'FAILED' ? 'error' : 'processing'">
          {{ t('FinanceTax.importStatus.' + row.status) }}
        </a-tag>
      </template>
      <template #actions="row">
        <a-button
          v-if="row.status === 'FAILED'"
          type="link"
          @click="failure(row)"
        >
          {{ t('FinanceTax.failureReason') }}
        </a-button>
      </template>
      <template #emptyText><CloudEmpty :description="t('FinanceTax.noHistory')" /></template>
    </j-pro-table>
    <template #foot>
      <a-button @click="emit('close')">{{ t('Finance.close') }}</a-button>
    </template>
  </JlDrawerShell>
</template>
<style scoped>
.tax-change-text {
  overflow-wrap: anywhere;
}
</style>
