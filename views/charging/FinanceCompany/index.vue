<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import ConditionFilter from '@jetlinks-web-core/components/ConditionFilter'
import type { ConditionFilterChangePayload } from '@jetlinks-web-core/components/ConditionFilter'
import type { Query } from '../../../api/archive'
import type { Company } from '../../../api/finance'
import { useCompanyCatalog, companyPermission } from '../../../hooks/finance/useCompanyCatalog'
import CompanyDrawer from './CompanyDrawer.vue'
const { t } = useI18n()
const state = useCompanyCatalog()
const {
  table,
  terms,
  params,
  open,
  detail,
  loading,
  failed,
  saving,
  readOnly,
  select,
  close,
  save,
  remove,
  request,
  retry,
  reload
} = state
const columns = computed(() => [
  { title: t('Finance.companyName'), dataIndex: 'companyName', width: 260, scopedSlots: true },
  { title: t('Finance.taxNumber'), dataIndex: 'taxNumber', width: 220 },
  { title: t('Finance.phone'), dataIndex: 'phone', width: 150 },
  { title: t('Finance.depositBank'), dataIndex: 'depositBank', width: 210 },
  { title: t('Finance.drawer'), dataIndex: 'drawer', width: 120 },
  { title: t('Finance.actions'), dataIndex: 'actions', width: 190, fixed: 'right', scopedSlots: true }
])
const fields = computed(() =>
  ['companyName', 'taxNumber', 'phone'].map((key) => ({
    title: t('Finance.' + key),
    dataIndex: key,
    search: { type: 'string' }
  }))
)
const filter = ({ filter }: ConditionFilterChangePayload) => {
  terms.value = (filter.terms || []) as Query['terms']
}
const view = (row: Company) => select(row.id)
</script>
<template>
  <j-page-container>
    <div class="finance-workspace">
      <div class="finance-toolbar">
        <a-button @click="reload">
          <AIcon type="ReloadOutlined" />
          {{ t('Finance.refresh') }}
        </a-button>
        <j-permission-button
          :hasPermission="`${companyPermission}:save`"
          type="primary"
          @click="select(undefined, false)"
        >
          <AIcon type="PlusOutlined" />
          {{ t('Finance.create') }}
        </j-permission-button>
      </div>
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
        :scroll="{ x: 1150 }"
        :alert-show="false"
        :body-style="{ padding: 0 }"
      >
        <template #companyName="row">
          <a-button
            type="link"
            class="finance-company-name"
            @click="view(row)"
          >
            {{ row.companyName }}
          </a-button>
        </template>
        <template #actions="row">
          <a-space :size="0">
            <a-button
              type="link"
              size="small"
              @click="view(row)"
            >
              {{ t('Finance.detail') }}
            </a-button>
            <j-permission-button
              :hasPermission="`${companyPermission}:save`"
              type="link"
              size="small"
              @click="select(row.id, false)"
            >
              {{ t('Finance.edit') }}
            </j-permission-button>
            <a-popconfirm
              :title="t('Finance.deleteConfirm', { name: row.companyName })"
              @confirm="remove(row)"
            >
              <j-permission-button
                :hasPermission="`${companyPermission}:delete`"
                type="link"
                danger
                size="small"
              >
                {{ t('Finance.delete') }}
              </j-permission-button>
            </a-popconfirm>
          </a-space>
        </template>
        <template #emptyText><CloudEmpty :description="t('Finance.noCompanies')" /></template>
      </j-pro-table>
    </div>
    <CompanyDrawer
      :open="open"
      :detail="detail"
      :state="{ loading, failed, saving, readOnly }"
      @close="close"
      @retry="retry"
      @save="save"
    />
  </j-page-container>
</template>
<style src="../finance.css"></style>
