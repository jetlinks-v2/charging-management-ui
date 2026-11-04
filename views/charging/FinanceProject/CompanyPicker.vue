<script setup lang="ts">
import { computed, toRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { useCompanyPicker } from '../../../hooks/finance/useCompanyPicker'
const props = defineProps<{ open: boolean; context: { busy: boolean; boundIds: string[]; projectId: string } }>()
const emit = defineEmits<{ close: []; confirm: [string, string] }>()
const { t } = useI18n()
const { keyword, search, selected, params, request, rowSelection } = useCompanyPicker(
  toRef(props, 'open'),
  () => props.context.projectId
)
const columns = computed(() => [
  { title: t('Finance.companyName'), dataIndex: 'companyName', width: 280 },
  { title: t('Finance.taxNumber'), dataIndex: 'taxNumber', width: 220 },
  { title: t('Finance.phone'), dataIndex: 'phone', width: 150 }
])
const selection = computed(() => ({
  ...rowSelection.value,
  getCheckboxProps: (row: { id: string }) => ({
    disabled: props.context.boundIds.includes(row.id) || props.context.busy
  })
}))
</script>
<template>
  <a-modal
    :open="open"
    :title="t('Finance.bindTitle')"
    :width="820"
    :confirm-loading="context.busy"
    :ok-text="t('Finance.confirmBind')"
    :cancel-text="t('Finance.cancel')"
    :ok-button-props="{ disabled: !selected || context.busy }"
    :mask-closable="!context.busy"
    @cancel="!context.busy && emit('close')"
    @ok="selected && emit('confirm', selected.id, selected.companyName)"
  >
    <a-input-search
      v-model:value="keyword"
      :placeholder="t('Finance.searchCompanies')"
      :aria-label="t('Finance.searchCompanies')"
      allow-clear
      @search="search = keyword"
    />
    <j-pro-table
      v-if="open"
      row-key="id"
      mode="TABLE"
      type="PAGE"
      :columns="columns"
      :params="params"
      :request="request"
      :row-selection="selection"
      :no-pagination="false"
      :pagination="{ pageSize: 6 }"
      :alert-show="false"
      :body-style="{ padding: '16px 0 0' }"
      :scroll="{ x: 650 }"
    >
      <template #emptyText><CloudEmpty :description="t('Finance.noMatches')" /></template>
    </j-pro-table>
  </a-modal>
</template>
