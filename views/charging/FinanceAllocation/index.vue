<script setup lang="ts">
import FinancePage from '../components/FinancePage.vue'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import dayjs from 'dayjs'
import ConditionFilter, { type ConditionFilterChangePayload } from '@jetlinks-web-core/components/ConditionFilter'
import type { Query } from '../../../api/archive'
import { useAllocationWorkspace } from '../../../hooks/finance-allocation/useAllocationWorkspace'
import ProjectScopeBar from '../components/ProjectScopeBar.vue'
import AllocationActions from './AllocationActions.vue'
import AllocationDetail from './AllocationDetail.vue'
import AllocationEditor from './AllocationEditor.vue'
import AllocationNumberDialog from './AllocationNumberDialog.vue'
import './allocation.css'
const { t } = useI18n()
const {
  projectId,
  table,
  poolTable,
  terms,
  params,
  request,
  poolRequest,
  logRequest,
  open,
  readOnly,
  loading,
  failed,
  saving,
  tab,
  detail,
  options,
  numberTarget,
  select,
  retry,
  close,
  save,
  remove,
  changeNumber,
  reload,
  notify
} = useAllocationWorkspace()
const fields = computed(() => [
  { title: t('Allocation.billCode'), dataIndex: 'billCode', search: { type: 'string' as const } },
  { title: t('Allocation.recipient'), dataIndex: 'recipientName', search: { type: 'string' as const } },
  { title: t('Allocation.buyDate'), dataIndex: 'buyDate', search: { type: 'date' as const } },
  {
    title: t('Allocation.enabled'),
    dataIndex: 'enabled',
    search: {
      type: 'select' as const,
      options: [
        { value: true, label: t('Allocation.isEnabled') },
        { value: false, label: t('Allocation.isDisabled') }
      ]
    }
  }
])
const columns = computed(() => [
  { title: t('Allocation.billCode'), dataIndex: 'billCode', width: 160 },
  { title: t('Allocation.recipient'), dataIndex: 'recipientName', width: 140 },
  { title: t('Allocation.range'), dataIndex: 'range', scopedSlots: true, width: 230 },
  { title: t('Allocation.counts'), dataIndex: 'counts', scopedSlots: true, width: 170 },
  { title: t('Allocation.buyDate'), dataIndex: 'buyDate', width: 130 },
  { title: t('Allocation.billType'), dataIndex: 'billTypeName', width: 120 },
  { title: t('Allocation.state'), dataIndex: 'state', scopedSlots: true, width: 100 },
  { title: t('Finance.actions'), dataIndex: 'actions', scopedSlots: true, width: 230, fixed: 'right' }
])
const poolColumns = computed(() => [
  { title: t('Allocation.number'), dataIndex: 'number', width: 180 },
  { title: t('Allocation.state'), dataIndex: 'state', scopedSlots: true, width: 130 },
  { title: t('Finance.actions'), dataIndex: 'actions', scopedSlots: true, width: 130 }
])
const logColumns = computed(() => [
  { title: t('Allocation.createTime'), dataIndex: 'createTime', scopedSlots: true, width: 180 },
  { title: t('Allocation.operation'), dataIndex: 'action', scopedSlots: true, width: 130 },
  { title: t('Allocation.operator'), dataIndex: 'modifierName', width: 130 },
  { title: t('Allocation.reason'), dataIndex: 'reason', width: 200 }
])
function filter({ filter }: ConditionFilterChangePayload) {
  terms.value = (filter.terms || []) as Query['terms']
}
</script>
<template>
  <FinancePage>
    <ProjectScopeBar />
    <section class="finance-workspace">
      <div class="finance-toolbar">
        <j-permission-button
          type="primary"
          hasPermission="charging/FinanceAllocation:save"
          :disabled="!projectId || saving"
          @click="select(undefined, false)"
        >
          <AIcon type="PlusOutlined" />
          {{ t('Allocation.create') }}
        </j-permission-button>
        <a-button
          :disabled="!projectId || saving"
          :aria-label="t('Finance.refresh')"
          @click="reload"
        >
          <AIcon type="ReloadOutlined" />
        </a-button>
      </div>
      <ConditionFilter
        :fields="fields"
        @change="filter"
      />
      <j-pro-table
        v-if="projectId"
        ref="table"
        row-key="id"
        type="PAGE"
        mode="TABLE"
        :columns="columns"
        :params="params"
        :request="request"
        :pagination="{ pageSize: 12 }"
        :no-pagination="false"
        :alert-show="false"
        :body-style="{ padding: 0 }"
        :scroll="{ x: 1380 }"
        @request-error="notify"
      >
        <template #range="row">
          <span class="allocation-range">{{ row.startNumber }} — {{ row.endNumber }}</span>
        </template>
        <template #counts="row">
          <span class="allocation-range">
            {{ row.enabled && !row.recovered ? row.numberCount - row.usedCount - row.discardedCount : 0 }} /
            {{ row.usedCount }} / {{ row.discardedCount }}
          </span>
        </template>
        <template #state="row">
          <a-tag :color="row.enabled && !row.recovered ? 'green' : undefined">
            {{
              t(
                row.recovered
                  ? 'Allocation.isRecovered'
                  : row.enabled
                    ? 'Allocation.isEnabled'
                    : 'Allocation.isDisabled'
              )
            }}
          </a-tag>
        </template>
        <template #actions="row">
          <AllocationActions
            :row="row"
            :busy="saving"
            @detail="select(row.id)"
            @pool="select(row.id, true, 'pool')"
            @edit="select(row.id, false)"
            @delete="remove(row)"
          />
        </template>
        <template #emptyText><CloudEmpty :description="t('Allocation.empty')" /></template>
      </j-pro-table>
      <CloudEmpty
        v-else
        :description="t('ProjectScope.chooseFirst')"
      />
    </section>
    <JlDrawerShell
      :open="open"
      :width="880"
      icon="FileTextOutlined"
      :title="t(readOnly ? 'Allocation.detail' : detail ? 'Allocation.edit' : 'Allocation.create')"
      @update:open="close"
    >
      <a-skeleton
        v-if="loading"
        active
        :paragraph="{ rows: 10 }"
      />
      <CloudEmpty
        v-else-if="failed"
        :description="t('Finance.detailFailed')"
      >
        <a-button @click="retry">{{ t('Finance.retry') }}</a-button>
      </CloudEmpty>
      <AllocationEditor
        v-else-if="open && !readOnly"
        :project="projectId"
        :detail="detail"
        :options="options"
        :busy="saving"
        @save="save"
        @cancel="close"
        @error="notify"
      />
      <a-tabs
        v-else-if="detail"
        v-model:active-key="tab"
      >
        <a-tab-pane
          key="info"
          :tab="t('Allocation.bookInfo')"
        >
          <AllocationDetail :row="detail" />
        </a-tab-pane>
        <a-tab-pane
          key="pool"
          :tab="t('Allocation.pool')"
        >
          <j-pro-table
            ref="poolTable"
            :key="detail.id"
            row-key="id"
            type="PAGE"
            mode="TABLE"
            :columns="poolColumns"
            :request="poolRequest"
            :pagination="{ pageSize: 12 }"
            :no-pagination="false"
            :alert-show="false"
            :body-style="{ padding: 0 }"
            :scroll="{ x: 440 }"
            @request-error="notify"
          >
            <template #state="row">
              <a-tag
                :color="row.used ? 'blue' : row.enabled && !detail.recovered && detail.enabled ? 'green' : undefined"
              >
                {{
                  t(
                    row.used
                      ? 'Allocation.isUsed'
                      : !row.enabled
                        ? 'Allocation.isDiscarded'
                        : detail.recovered
                          ? 'Allocation.isRecovered'
                          : detail.enabled
                            ? 'Allocation.isAvailable'
                            : 'Allocation.isDisabled'
                  )
                }}
              </a-tag>
            </template>
            <template #actions="row">
              <j-permission-button
                v-if="!row.used"
                type="link"
                hasPermission="charging/FinanceAllocation:pool"
                :disabled="saving"
                @click="numberTarget = row"
              >
                {{ t(row.enabled ? 'Allocation.discardNumber' : 'Allocation.enableNumber') }}
              </j-permission-button>
              <span v-else>—</span>
            </template>
            <template #emptyText><CloudEmpty /></template>
          </j-pro-table>
        </a-tab-pane>
        <a-tab-pane
          key="logs"
          :tab="t('Allocation.logs')"
        >
          <j-pro-table
            :key="detail.id"
            row-key="id"
            type="PAGE"
            mode="TABLE"
            :columns="logColumns"
            :request="logRequest"
            :pagination="{ pageSize: 12 }"
            :no-pagination="false"
            :alert-show="false"
            :body-style="{ padding: 0 }"
            :scroll="{ x: 640 }"
            @request-error="notify"
          >
            <template #createTime="row">{{ dayjs(row.createTime).format('YYYY-MM-DD HH:mm:ss') }}</template>
            <template #action="row">{{ t('Allocation.actions.' + row.action) }}</template>
            <template #emptyText><CloudEmpty /></template>
          </j-pro-table>
        </a-tab-pane>
      </a-tabs>
    </JlDrawerShell>
    <AllocationNumberDialog
      v-if="numberTarget"
      :row="numberTarget"
      :busy="saving"
      @save="changeNumber"
      @cancel="!saving && (numberTarget = undefined)"
    />
  </FinancePage>
</template>

<style src="../finance.css"></style>
