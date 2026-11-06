<script setup lang="ts">
import { formatFinanceTime } from '../../../utils/financeTime'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { useTaxCatalog } from '../../../hooks/finance-tax/useTaxCatalog'
import { taxPermission } from '../../../hooks/finance-tax/useTaxCatalog'
const props = defineProps<{ state: ReturnType<typeof useTaxCatalog> }>()
const { t } = useI18n()
const {
  table,
  params,
  request,
  notify,
  companyFailed,
  companyLoading,
  companyOptions,
  select,
  toggle,
  busy
} = props.state
const columns = computed(() => [
  { title: t('FinanceTax.goodsName'), dataIndex: 'goodsName', width: 190, fixed: 'left', scopedSlots: true },
  { title: t('FinanceTax.goodsShortName'), dataIndex: 'goodsShortName', width: 150 },
  { title: t('FinanceTax.goodsCode'), dataIndex: 'goodsCode', width: 190 },
  { title: t('FinanceTax.classificationName'), dataIndex: 'classificationName', width: 180 },
  { title: t('FinanceTax.taxRate'), dataIndex: 'taxRate', width: 100, scopedSlots: true },
  { title: t('FinanceTax.specAndTypes'), dataIndex: 'specAndTypes', width: 130 },
  { title: t('FinanceTax.unit'), dataIndex: 'unit', width: 100 },
  { title: t('FinanceTax.price'), dataIndex: 'price', width: 130, scopedSlots: true },
  { title: t('FinanceTax.includingTaxFlag'), dataIndex: 'includingTaxFlag', width: 110, scopedSlots: true },
  {
    title: t('FinanceTax.favouredPolicyFlag'),
    dataIndex: 'favouredPolicyFlag',
    width: 120,
    scopedSlots: true
  },
  { title: t('FinanceTax.favouredPolicyName'), dataIndex: 'favouredPolicyName', width: 180 },
  { title: t('Finance.companyName'), dataIndex: 'companyName', width: 220 },
  { title: t('FinanceTax.enabled'), dataIndex: 'enabled', width: 100, scopedSlots: true },
  { title: t('FinanceTax.updated'), dataIndex: 'modifyTime', width: 180, scopedSlots: true },
  { title: t('Finance.actions'), dataIndex: 'actions', width: 90, fixed: 'right', scopedSlots: true }
])
</script>
<template>
  <div class="tax-table">
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
      :scroll="{ x: 2250 }"
      :alert-show="false"
      :body-style="{ padding: 0 }"
      @request-error="notify"
    >
      <template #goodsName="row">
        <a-button
          type="link"
          class="finance-company-name"
          @click="select(row.id)"
        >
          {{ row.goodsName }}
        </a-button>
      </template>
      <template #enabled="row">
        <a-tag :color="row.enabled ? 'success' : 'default'">
          {{ t('FinanceTax.' + (row.enabled ? 'active' : 'inactive')) }}
        </a-tag>
      </template>
      <template #taxRate="row">{{ Number((row.taxRate * 100).toFixed(6)) }}%</template>
      <template #price="row">{{ row.price ?? '—' }}</template>
      <template #includingTaxFlag="row">
        {{ t('FinanceTax.' + (row.includingTaxFlag === 1 ? 'yes' : 'no')) }}
      </template>
      <template #favouredPolicyFlag="row">
        {{ t('FinanceTax.' + (row.favouredPolicyFlag === 1 ? 'yes' : 'no')) }}
      </template>
      <template #modifyTime="row">
        {{ row.modifyTime ? formatFinanceTime(row.modifyTime) : '—' }}
      </template>
      <template #actions="row">
        <a-popconfirm
          :title="t('FinanceTax.stateConfirm', { name: row.goodsName })"
          @confirm="toggle(row)"
        >
          <j-permission-button
            :hasPermission="`${taxPermission}:save`"
            type="link"
            size="small"
            :disabled="busy"
          >
            {{ t('FinanceTax.' + (row.enabled ? 'disable' : 'enable')) }}
          </j-permission-button>
        </a-popconfirm>
      </template>
      <template #emptyText>
        <CloudEmpty
          :description="
            t(
              companyFailed
                ? 'FinanceTax.companiesFailed'
                : companyLoading
                  ? 'FinanceTax.companiesLoading'
                  : companyOptions.length
                    ? 'FinanceTax.empty'
                    : 'FinanceTax.noCompanies'
            )
          "
        />
      </template>
    </j-pro-table>
  </div>
</template>
<style scoped>
.tax-table {
  min-width: 0;
}
</style>
