<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import ConditionFilter, {
  type ConditionFilterChangePayload
} from '@jetlinks-web-core/components/ConditionFilter'
import type { Query } from '../../../api/archive'
import { useTaxCatalog, taxPermission } from '../../../hooks/finance-tax/useTaxCatalog'
import ProjectScopeBar from '../components/ProjectScopeBar.vue'
import TaxDrawer from './TaxDrawer.vue'
import TaxHistoryDrawer from './TaxHistoryDrawer.vue'
import TaxImportModal from './TaxImportModal.vue'
import TaxTable from './TaxTable.vue'
const { t } = useI18n()
const state = useTaxCatalog()
const {
  projectId,
  companyOptions,
  companyId,
  terms,
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
  close,
  save,
  retry,
  startImport
} = state
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
</script>
<template>
  <j-page-container>
    <div class="tax-page">
      <ProjectScopeBar />
      <div
        v-if="projectId"
        class="finance-workspace tax-workspace"
      >
        <div class="tax-toolbar">
          <div class="tax-company-filter">
            <a-select
              v-model:value="companyId"
              allow-clear
              show-search
              option-filter-prop="label"
              :options="companyOptions"
              :loading="companyLoading"
              :disabled="busy || companyLoading"
              :placeholder="t('FinanceTax.allCompanies')"
              :aria-label="t('Finance.companyName')"
            />
            <a-button
              v-if="companyFailed"
              :disabled="companyLoading"
              @click="loadCompanies"
            >
              {{ t('Finance.retry') }}
            </a-button>
          </div>
          <div class="tax-actions">
            <a-button @click="importsOpen = true">{{ t('FinanceTax.importRecords') }}</a-button>
            <j-permission-button
              :hasPermission="`${taxPermission}:import`"
              type="primary"
              :disabled="busy || companyLoading || companyFailed || !companyOptions.length"
              @click="startImport"
            >
              <AIcon type="ImportOutlined" />
              {{ t('FinanceTax.import') }}
            </j-permission-button>
          </div>
        </div>
        <ConditionFilter
          :key="projectId"
          :columns="fields"
          @change="filter"
        />
        <TaxTable :state="state" />
      </div>
      <CloudEmpty
        v-else
        :description="t('ProjectContext.choose')"
      />
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
    <TaxImportModal :state="state" />
    <TaxHistoryDrawer
      :open="importsOpen"
      :project-id="projectId"
      :companies="companyOptions"
      @close="importsOpen = false"
    />
  </j-page-container>
</template>
<style src="../finance.css"></style>
<style scoped>
.tax-page,
.tax-workspace {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
}
.tax-workspace {
  min-height: 520px;
}
.tax-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px 24px;
}
.tax-company-filter {
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 240px;
  gap: 8px;
}
.tax-company-filter .ant-select {
  width: 360px;
  max-width: 100%;
}
.tax-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-left: auto;
}
@media (max-width: 680px) {
  .tax-company-filter {
    flex-basis: 100%;
    min-width: 0;
  }
  .tax-company-filter .ant-select {
    flex: 1;
    width: auto;
    min-width: 0;
  }
}
</style>
