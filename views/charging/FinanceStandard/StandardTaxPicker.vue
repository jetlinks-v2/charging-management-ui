<script setup lang="ts">
import { computed, toRef } from 'vue'
import { useI18n } from 'vue-i18n'
import type { TaxItem } from '../../../api/financeTax'
import { useStandardTaxPicker } from '../../../hooks/finance-standard/useStandardTaxPicker'
const props = defineProps<{ open: boolean; projectId: string }>()
const emit = defineEmits<{ close: []; select: [TaxItem]; error: [unknown] }>()
const { t } = useI18n()
const { keyword, search, selected, params, selection, request } = useStandardTaxPicker(
  toRef(props, 'open'),
  () => props.projectId
)
const columns = computed(() => [
  { title: t('FinanceTax.goodsName'), dataIndex: 'goodsName', width: 210 },
  { title: t('Finance.companyName'), dataIndex: 'companyName', width: 230 },
  { title: t('FinanceTax.goodsCode'), dataIndex: 'goodsCode', width: 180 },
  { title: t('FinanceTax.taxRate'), dataIndex: 'taxRate', width: 100, scopedSlots: true }
])
</script>
<template>
  <a-modal
    :open="open"
    :title="t('Standard.chooseTax')"
    :width="900"
    :ok-button-props="{ disabled: !selected }"
    :ok-text="t('Standard.confirmTax')"
    @cancel="emit('close')"
    @ok="selected && emit('select', selected)"
  >
    <a-input-search
      v-model:value="keyword"
      :placeholder="t('Standard.searchTax')"
      :aria-label="t('Standard.searchTax')"
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
      :scroll="{ x: 720 }"
      @request-error="emit('error', $event)"
    >
      <template #taxRate="row">{{ Number((row.taxRate * 100).toFixed(6)) }}%</template>
      <template #emptyText><CloudEmpty :description="t('Standard.noTaxes')" /></template>
    </j-pro-table>
  </a-modal>
</template>
