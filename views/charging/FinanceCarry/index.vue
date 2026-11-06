<script setup lang="ts">
import FinancePage from '../components/FinancePage.vue'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import ConditionFilter, { type ConditionFilterChangePayload } from '@jetlinks-web-core/components/ConditionFilter'
import type { Query } from '../../../api/archive'
import type { CarryPlan } from '../../../api/financeCarry'
import { useCarryWorkspace } from '../../../hooks/finance-carry/useCarryWorkspace'
import ProjectScopeBar from '../components/ProjectScopeBar.vue'
import CarryEditor from './CarryEditor.vue'
import CarryDetail from './CarryDetail.vue'
import CarryHistory from './CarryHistory.vue'
const { t } = useI18n()
const {
  projectId,
  table,
  terms,
  params,
  request,
  open,
  readOnly,
  loading,
  failed,
  saving,
  detail,
  subjects,
  history,
  select,
  retry,
  close,
  save,
  change,
  reload,
  notify
} = useCarryWorkspace()
const historyView = ref<{ retrying: boolean }>()
const rowKey = (row: CarryPlan) => row.plan.id
function closeHistory() {
  if (!historyView.value?.retrying) history.value = undefined
}
const fields = computed(() => [{ title: t('Carry.name'), dataIndex: 'name', search: { type: 'string' as const } }])
const columns = computed(() => [
  { title: t('Carry.state'), dataIndex: 'state', scopedSlots: true, width: 100 },
  { title: t('Carry.name'), dataIndex: 'name', scopedSlots: true, width: 230 },
  { title: t('Carry.schedule'), dataIndex: 'schedule', scopedSlots: true, width: 250 },
  { title: t('Carry.period'), dataIndex: 'period', scopedSlots: true, width: 220 },
  { title: t('Carry.remissionMode'), dataIndex: 'remission', scopedSlots: true, width: 170 },
  { title: t('Finance.actions'), dataIndex: 'actions', scopedSlots: true, width: 240, fixed: 'right' }
])
function filter({ filter }: ConditionFilterChangePayload) {
  terms.value = (filter.terms || []) as Query['terms']
}
function schedule(row: CarryPlan) {
  const i = row.input
  const day =
    i.frequency === 'DAILY'
      ? ''
      : i.frequency === 'WEEKLY'
        ? t('Carry.week' + i.executeDay)
        : i.frequency === 'MONTHLY'
          ? t('Carry.day', { day: i.executeDay })
          : i.executeDay
  return [t('Carry.' + i.frequency), day, i.executeAt].filter(Boolean).join(' · ')
}
</script>
<template>
  <FinancePage
    fixed
    collection
  >
    <ProjectScopeBar />
    <section class="finance-workspace carry-workspace">
      <div class="carry-heading">
        <div>
          <h2>{{ t('Carry.title') }}</h2>
          <p>{{ t('Carry.hint') }}</p>
        </div>
        <a-space>
          <j-permission-button
            type="primary"
            hasPermission="charging/FinanceCarry:save"
            :disabled="!projectId || saving"
            @click="select(undefined, false)"
          >
            <AIcon type="PlusOutlined" />
            {{ t('Carry.create') }}
          </j-permission-button>
          <a-button
            :disabled="!projectId || saving"
            :aria-label="t('Finance.refresh')"
            @click="reload"
          >
            <AIcon type="ReloadOutlined" />
          </a-button>
        </a-space>
      </div>
      <ConditionFilter
        class="collection-filter"
        :fields="fields"
        @change="filter"
      />
      <j-pro-table
        v-if="projectId"
        ref="table"
        :row-key="rowKey"
        type="PAGE"
        mode="TABLE"
        :columns="columns"
        :params="params"
        :request="request"
        :pagination="{ pageSize: 12 }"
        :no-pagination="false"
        :alert-show="false"
        :body-style="{ padding: 0 }"
        :scroll="{ x: 1210 }"
        @request-error="notify"
      >
        <template #state="row">
          <a-tag :color="row.plan.enabled ? 'green' : undefined">
            {{ t(row.plan.enabled ? 'Carry.enabledState' : 'Carry.disabledState') }}
          </a-tag>
        </template>
        <template #name="row">
          <a-button
            type="link"
            class="carry-plan-name"
            @click="select(row.plan.id)"
          >
            {{ row.input.name }}
          </a-button>
        </template>
        <template #schedule="row">
          <span>{{ schedule(row) }}</span>
          <small class="carry-zone">{{ row.input.zone }}</small>
        </template>
        <template #period="row">{{ row.input.periodStart }} ~ {{ row.input.periodEnd }}</template>
        <template #remission="row">
          {{ t('Carry.' + row.input.remissionMode)
          }}{{ row.input.remissionMode === 'NONE' ? '' : ' · ' + row.input.remissionValue }}
        </template>
        <template #actions="row">
          <a-space :size="0">
            <a-button
              type="link"
              @click="select(row.plan.id)"
            >
              {{ t('Finance.detail') }}
            </a-button>
            <a-button
              type="link"
              @click="history = row"
            >
              {{ t('Carry.history') }}
            </a-button>
            <a-dropdown>
              <a-button type="link">
                {{ t('Carry.more') }}
                <AIcon type="DownOutlined" />
              </a-button>
              <template #overlay>
                <a-menu>
                  <a-menu-item>
                    <j-permission-button
                      type="link"
                      hasPermission="charging/FinanceCarry:save"
                      :disabled="saving"
                      @click="select(row.plan.id, false)"
                    >
                      {{ t('Finance.edit') }}
                    </j-permission-button>
                  </a-menu-item>
                  <a-menu-item>
                    <a-popconfirm
                      :title="t('Carry.stateConfirm')"
                      @confirm="change(row)"
                    >
                      <j-permission-button
                        type="link"
                        hasPermission="charging/FinanceCarry:state"
                        :disabled="saving"
                      >
                        {{ t(row.plan.enabled ? 'Carry.disable' : 'Carry.enable') }}
                      </j-permission-button>
                    </a-popconfirm>
                  </a-menu-item>
                  <a-menu-item>
                    <a-popconfirm
                      :title="t('Carry.deleteConfirm')"
                      @confirm="change(row, true)"
                    >
                      <j-permission-button
                        type="link"
                        danger
                        hasPermission="charging/FinanceCarry:delete"
                        :disabled="saving"
                      >
                        {{ t('Finance.delete') }}
                      </j-permission-button>
                    </a-popconfirm>
                  </a-menu-item>
                </a-menu>
              </template>
            </a-dropdown>
          </a-space>
        </template>
        <template #emptyText><CloudEmpty :description="t('Carry.emptyPlans')" /></template>
      </j-pro-table>
      <CloudEmpty
        v-else
        :description="t('ProjectScope.chooseFirst')"
      />
    </section>
    <JlDrawerShell
      :open="open"
      :width="820"
      icon="SwapOutlined"
      :title="t(readOnly ? 'Carry.detail' : detail ? 'Carry.edit' : 'Carry.create')"
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
      <CarryDetail
        v-else-if="readOnly && detail"
        :detail="detail"
        :subjects="subjects"
      />
      <CarryEditor
        v-else-if="open && !readOnly"
        :detail="detail"
        :subjects="subjects"
        :saving="saving"
        @save="save"
        @cancel="close"
      />
      <template
        v-if="readOnly || loading || failed"
        #foot
      >
        <a-button @click="close">{{ t('Finance.close') }}</a-button>
      </template>
    </JlDrawerShell>
    <JlDrawerShell
      v-if="history && projectId"
      :open="true"
      :width="1060"
      icon="HistoryOutlined"
      :title="t('Carry.history')"
      :sub="history.input.name"
      @update:open="closeHistory"
    >
      <CarryHistory
        ref="historyView"
        :project-id="projectId"
        :plan-id="history.plan.id"
      />
      <template #foot>
        <a-button
          :disabled="historyView?.retrying"
          @click="closeHistory"
        >
          {{ t('Finance.close') }}
        </a-button>
      </template>
    </JlDrawerShell>
  </FinancePage>
</template>
<style src="../finance.css"></style>
<style scoped src="./index.css"></style>
