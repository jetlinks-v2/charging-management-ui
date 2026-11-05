<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import ConditionFilter, { type ConditionFilterChangePayload } from '@jetlinks-web-core/components/ConditionFilter'
import type { Query } from '../../../api/archive'
import type { TaxItem } from '../../../api/financeTax'
import { useTaxCatalog, taxPermission } from '../../../hooks/finance-tax/useTaxCatalog'
import ProjectScopeBar from '../components/ProjectScopeBar.vue'
import TaxDrawer from './TaxDrawer.vue'
import TaxHistoryDrawer from './TaxHistoryDrawer.vue'
const { t } = useI18n()
const {
  projectId,
  table,
  companyOptions,
  companyId,
  terms,
  params,
  selected,
  busy,
  companyLoading,
  companyFailed,
  open,
  readOnly,
  detail,
  detailLoading,
  detailFailed,
  importsOpen,
  loadCompanies,
  reload,
  select,
  close,
  save,
  toggle,
  remove,
  request,
  template,
  upload,
  notify,
  retry
} = useTaxCatalog()
const columns = computed(() => [
  { title: t('FinanceTax.goodsName'), dataIndex: 'goodsName', width: 200, scopedSlots: true },
  { title: t('FinanceTax.enabled'), dataIndex: 'enabled', width: 100, scopedSlots: true },
  { title: t('Finance.companyName'), dataIndex: 'companyName', width: 220 },
  { title: t('FinanceTax.goodsCode'), dataIndex: 'goodsCode', width: 180 },
  { title: t('FinanceTax.taxRate'), dataIndex: 'taxRate', width: 100, scopedSlots: true },
  { title: t('FinanceTax.includingTaxFlag'), dataIndex: 'includingTaxFlag', width: 100, scopedSlots: true },
  { title: t('Finance.actions'), dataIndex: 'actions', width: 230, fixed: 'right', scopedSlots: true }
])
const fields = computed(() => [
  ...['goodsName', 'goodsCode', 'classificationName'].map((key) => ({
    title: t('FinanceTax.' + key),
    dataIndex: key,
    search: { type: 'string' }
  })),
  {
    title: t('FinanceTax.enabled'),
    dataIndex: 'enabled',
    search: {
      type: 'select',
      options: [
        { value: true, label: t('FinanceTax.active') },
        { value: false, label: t('FinanceTax.inactive') }
      ]
    }
  }
])
const filter = ({ filter }: ConditionFilterChangePayload) => {
  terms.value = (filter.terms || []) as Query['terms']
}
const selectionChanged = (_keys: unknown, rows: TaxItem[]) => {
  selected.value = rows
}
</script>
<template>
  <j-page-container>
    <ProjectScopeBar>
      <a-button
        :disabled="!projectId || busy"
        @click="reload"
      >
        {{ t('Finance.refresh') }}
      </a-button>
      <j-permission-button
        :hasPermission="`${taxPermission}:save`"
        type="primary"
        :disabled="!projectId || !companyOptions.length || busy"
        @click="select(undefined, false)"
      >
        <AIcon type="PlusOutlined" />
        {{ t('FinanceTax.create') }}
      </j-permission-button>
    </ProjectScopeBar>
    <div
      v-if="projectId"
      class="finance-workspace"
    >
      <a-space
        wrap
        class="tax-toolbar"
      >
        <a-select
          v-model:value="companyId"
          allow-clear
          show-search
          option-filter-prop="label"
          :options="companyOptions"
          :loading="companyLoading"
          :disabled="busy"
          :placeholder="t('FinanceTax.allCompanies')"
          class="tax-company-select"
          :aria-label="t('Finance.companyName')"
        />
        <a-button
          v-if="companyFailed"
          @click="loadCompanies"
        >
          {{ t('Finance.retry') }}
        </a-button>
        <j-permission-button
          :hasPermission="`${taxPermission}:import`"
          :disabled="busy"
          @click="template"
        >
          {{ t('FinanceTax.template') }}
        </j-permission-button>
        <a-upload
          :before-upload="upload"
          :show-upload-list="false"
          accept=".xls,.xlsx"
          :disabled="busy || !companyId"
        >
          <j-permission-button
            :hasPermission="`${taxPermission}:import`"
            :loading="busy"
            :disabled="busy || !companyId"
          >
            {{ t('FinanceTax.import') }}
          </j-permission-button>
        </a-upload>
        <a-button @click="importsOpen = true">{{ t('FinanceTax.importRecords') }}</a-button>
        <a-popconfirm
          :title="t('FinanceTax.deleteBatchConfirm', { count: selected.length })"
          @confirm="remove(selected)"
        >
          <j-permission-button
            :hasPermission="`${taxPermission}:delete`"
            danger
            :disabled="!selected.length || busy"
          >
            {{ t('FinanceTax.deleteSelected') }}
          </j-permission-button>
        </a-popconfirm>
      </a-space>
      <ConditionFilter
        :columns="fields"
        @change="filter"
      />
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
        :scroll="{ x: 1130 }"
        :alert-show="false"
        :body-style="{ padding: 0 }"
        :row-selection="{ selectedRowKeys: selected.map((row) => row.id), onChange: selectionChanged }"
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
        <template #includingTaxFlag="row">
          {{ t('FinanceTax.' + (row.includingTaxFlag === 1 ? 'including' : 'excluding')) }}
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
              :hasPermission="`${taxPermission}:save`"
              type="link"
              size="small"
              :disabled="busy"
              @click="select(row.id, false)"
            >
              {{ t('Finance.edit') }}
            </j-permission-button>
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
            <a-popconfirm
              :title="t('Finance.deleteConfirm', { name: row.goodsName })"
              @confirm="remove([row])"
            >
              <j-permission-button
                :hasPermission="`${taxPermission}:delete`"
                type="link"
                size="small"
                danger
                :disabled="busy"
              >
                {{ t('Finance.delete') }}
              </j-permission-button>
            </a-popconfirm>
          </a-space>
        </template>
        <template #emptyText>
          <CloudEmpty :description="t(companyOptions.length ? 'FinanceTax.empty' : 'FinanceTax.noCompanies')" />
        </template>
      </j-pro-table>
    </div>
    <TaxDrawer
      :open="open"
      :detail="detail"
      :companies="companyOptions"
      :company-id="companyId"
      :project-id="projectId"
      :state="{ loading: detailLoading, failed: detailFailed, saving: busy, readOnly }"
      @close="close"
      @retry="retry"
      @save="save"
    />
    <TaxHistoryDrawer
      :open="importsOpen"
      :project-id="projectId"
      @close="importsOpen = false"
    />
  </j-page-container>
</template>
<style src="../finance.css"></style>
<style scoped>
.tax-toolbar {
  margin-bottom: 1rem;
}
.tax-company-select {
  min-width: 18rem;
  max-width: 100%;
}
</style>
