<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import ConditionFilter, { type ConditionFilterChangePayload } from '@jetlinks-web-core/components/ConditionFilter'
import type { Query } from '../../../api/archive'
import { standardPermission, type useStandardWorkspace } from '../../../hooks/finance-standard/useStandardWorkspace'
const props = defineProps<{ state: ReturnType<typeof useStandardWorkspace> }>()
const { t } = useI18n()
const { projectId, options, effectiveStatus, terms, table, params, request, select, remove, notify } = props.state
const columns = computed(() => [
  { title: t('Standard.effectiveStatus'), dataIndex: 'effectiveStatus', width: 110, scopedSlots: true },
  { title: t('Standard.standardName'), dataIndex: 'standardName', width: 210, scopedSlots: true },
  { title: t('Standard.settlementMethod'), dataIndex: 'settlementMethod', width: 120, scopedSlots: true },
  { title: t('Standard.subjectId'), dataIndex: 'subjectName', width: 160 },
  { title: t('Standard.billingMethod'), dataIndex: 'billingMethod', width: 120, scopedSlots: true },
  { title: t('Standard.price'), dataIndex: 'price', width: 210, scopedSlots: true },
  { title: t('Standard.validity'), dataIndex: 'validity', width: 210, scopedSlots: true },
  { title: t('Finance.actions'), dataIndex: 'actions', width: 170, fixed: 'right', scopedSlots: true }
])
const fields = computed(() =>
  ['standardName', 'standardCode'].map((key) => ({
    title: t('Standard.' + key),
    dataIndex: key,
    search: { type: 'string' }
  }))
)
function filter({ filter }: ConditionFilterChangePayload) {
  terms.value = (filter.terms || []) as Query['terms']
}
const statusColor = (status: string) =>
  status === 'EFFECTIVE' ? 'success' : status === 'EXPIRED' ? 'default' : 'processing'
</script>
<template>
  <div class="standard-filters">
    <a-select
      v-model:value="effectiveStatus"
      :options="[
        { value: '', label: t('Standard.allStatus') },
        ...options.effectiveStatuses.map((row) => ({ value: row.value, label: row.text }))
      ]"
      class="standard-status"
      :aria-label="t('Standard.effectiveStatus')"
    />
    <ConditionFilter
      :columns="fields"
      @change="filter"
    />
  </div>
  <CloudEmpty
    v-if="!projectId"
    :description="t('ProjectContext.choose')"
  />
  <j-pro-table
    v-else
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
    :scroll="{ x: 1300 }"
    @request-error="notify"
  >
    <template #effectiveStatus="row">
      <a-tag :color="statusColor(row.effectiveStatus)">
        {{ options.effectiveStatuses.find((item) => item.value === row.effectiveStatus)?.text || row.effectiveStatus }}
      </a-tag>
    </template>
    <template #standardName="row">
      <a-button
        type="link"
        @click="select(row.id)"
      >
        {{ row.standardName }}
      </a-button>
    </template>
    <template #billingMethod="row">
      {{ options.billingMethods.find((item) => item.value === row.billingMethod)?.text || row.billingMethod }}
    </template>
    <template #settlementMethod="row">
      {{ options.settlementMethods.find((item) => item.value === row.settlementMethod)?.text || row.settlementMethod }}
    </template>
    <template #price="row">
      <span class="standard-amount">{{ row.price }}</span>
    </template>
    <template #validity="row">
      {{ row.executeDate || t('Standard.unlimitedStart') }} ～ {{ row.cancelDate || t('Standard.unlimitedEnd') }}
    </template>
    <template #actions="row">
      <a-space :size="0">
        <a-button
          type="link"
          size="small"
          @click="select(row.id)"
        >
          {{ t('Finance.detail') }}
        </a-button>
        <j-permission-button
          :hasPermission="`${standardPermission}:save`"
          type="link"
          size="small"
          @click="select(row.id, false)"
        >
          {{ t('Finance.edit') }}
        </j-permission-button>
        <a-popconfirm
          :title="t('Finance.deleteConfirm', { name: row.standardName })"
          @confirm="remove(row)"
        >
          <j-permission-button
            :hasPermission="`${standardPermission}:delete`"
            type="link"
            size="small"
            danger
          >
            {{ t('Finance.delete') }}
          </j-permission-button>
        </a-popconfirm>
      </a-space>
    </template>
    <template #emptyText><CloudEmpty :description="t('Standard.empty')" /></template>
  </j-pro-table>
</template>
<style scoped>
.standard-filters {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}
.standard-filters :deep(.condition-filter) {
  flex: 1;
  min-width: 220px;
}
.standard-status {
  min-width: 140px;
}
.standard-amount {
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
</style>
