<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import ConditionFilter from '@jetlinks-web-core/components/ConditionFilter'
import type { ConditionFilterChangePayload } from '@jetlinks-web-core/components/ConditionFilter'
import type { Query } from '../../../api/archive'
import { useRecorded, recordedPermission } from '../../../hooks/finance-recorded/useRecorded'
import ProjectScopeBar from '../components/ProjectScopeBar.vue'
import RecordedDrawer from './RecordedDrawer.vue'
const { t } = useI18n()
const state = useRecorded()
const { projectId, table, terms, params, saving, request, select, remove } = state
const columns = computed(() => [
  { title: t('Recorded.sourceCharge'), dataIndex: 'sourceChargeText', width: 150 },
  { title: t('Finance.companyName'), dataIndex: 'companyName', width: 230, scopedSlots: true },
  { title: t('Recorded.bank'), dataIndex: 'bankName', width: 200 },
  { title: t('Recorded.patternPayment'), dataIndex: 'patternPaymentText', width: 160 },
  { title: t('Recorded.fee'), dataIndex: 'serviceChargeType', width: 130, scopedSlots: true },
  { title: t('Finance.modified'), dataIndex: 'modifierName', width: 120 },
  { title: t('FinanceTax.updated'), dataIndex: 'modifyTime', width: 180, scopedSlots: true },
  { title: t('Finance.actions'), dataIndex: 'actions', width: 160, fixed: 'right', scopedSlots: true }
])
const fields = computed(() =>
  ['companyName', 'bankName', 'sourceChargeText', 'patternPaymentText'].map((key) => ({
    title: t('Recorded.filter.' + key),
    dataIndex: key,
    search: { type: 'string' }
  }))
)
const filter = ({ filter }: ConditionFilterChangePayload) => {
  terms.value = (filter.terms || []) as Query['terms']
}
</script>
<template>
  <div class="finance-workspace recorded-workspace">
    <ProjectScopeBar>
      <j-permission-button
        :hasPermission="`${recordedPermission}:recordedSave`"
        :disabled="!projectId"
        type="primary"
        @click="select(undefined, false)"
      >
        <AIcon type="PlusOutlined" />
        {{ t('Recorded.create') }}
      </j-permission-button>
    </ProjectScopeBar>
    <template v-if="projectId">
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
        <template #modifyTime="row">
          {{ row.modifyTime ? new Date(row.modifyTime).toLocaleString() : '—' }}
        </template>
        <template #companyName="row">
          <a-button
            type="link"
            class="finance-company-name"
            @click="select(row.id)"
          >
            {{ row.companyName }}
          </a-button>
        </template>
        <template #serviceChargeType="row">
          <a-tag>{{ t('Recorded.feeType.' + (row.serviceChargeType ?? 'none')) }}</a-tag>
        </template>
        <template #actions="row">
          <a-space :size="0">
            <j-permission-button
              :hasPermission="`${recordedPermission}:recordedSave`"
              type="link"
              size="small"
              :disabled="saving"
              @click="select(row.id, false)"
            >
              {{ t('Finance.edit') }}
            </j-permission-button>
            <a-popconfirm
              :title="t('Recorded.deleteConfirm', { name: row.companyName })"
              @confirm="remove(row)"
            >
              <j-permission-button
                :hasPermission="`${recordedPermission}:recordedDelete`"
                type="link"
                danger
                size="small"
                :disabled="saving"
              >
                {{ t('Finance.delete') }}
              </j-permission-button>
            </a-popconfirm>
          </a-space>
        </template>
        <template #emptyText><CloudEmpty :description="t('Recorded.empty')" /></template>
      </j-pro-table>
    </template>
    <CloudEmpty
      v-else
      :description="t('ProjectContext.choose')"
    />
    <RecordedDrawer :state="state" />
  </div>
</template>
<style src="../finance.css"></style>
<style scoped>
.recorded-workspace {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
}
</style>
