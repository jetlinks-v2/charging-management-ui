<script setup lang="ts">
import FinancePage from '../components/FinancePage.vue'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import ConditionFilter, { type ConditionFilterChangePayload } from '@jetlinks-web-core/components/ConditionFilter'
import type { Query } from '../../../api/archive'
import type { ActivitySummary } from '../../../api/financeActivity'
import { useActivityWorkspace } from '../../../hooks/finance-activity/useActivityWorkspace'
import ProjectScopeBar from '../components/ProjectScopeBar.vue'
import ActivityActions from './ActivityActions.vue'
import ActivityEditor from './ActivityEditor.vue'
import ActivityDetail from './ActivityDetail.vue'
import ActivityDate from './ActivityDate.vue'
import ActivityHistory from './ActivityHistory.vue'
import ActivityReview from './ActivityReview.vue'
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
  uploading,
  detail,
  options,
  history,
  dateChange,
  select,
  retry,
  close,
  save,
  change,
  saveEnd,
  reload,
  notify
} = useActivityWorkspace()
const fields = computed(() => [
  { title: t('Activity.name'), dataIndex: 'name', search: { type: 'string' as const } },
  {
    title: t('Activity.state'),
    dataIndex: 'enabled',
    search: {
      type: 'select' as const,
      options: [
        { value: true, label: t('Activity.enabled') },
        { value: false, label: t('Activity.disabled') }
      ]
    }
  }
])
const columns = computed(() => [
  { title: t('Activity.name'), dataIndex: 'name', scopedSlots: true, width: 220 },
  { title: t('Activity.type'), dataIndex: 'activityTypeName', width: 130 },
  { title: t('Activity.period'), dataIndex: 'period', scopedSlots: true, width: 230 },
  { title: t('Activity.subject'), dataIndex: 'subjectName', width: 160 },
  { title: t('Activity.standard'), dataIndex: 'standardName', width: 160 },
  { title: t('Activity.progress'), dataIndex: 'runtimeStatus', scopedSlots: true, width: 110 },
  { title: t('Activity.reviewState'), dataIndex: 'reviewState', scopedSlots: true, width: 110 },
  { title: t('Activity.state'), dataIndex: 'state', scopedSlots: true, width: 100 },
  { title: t('Finance.actions'), dataIndex: 'actions', scopedSlots: true, width: 230, fixed: 'right' }
])
function filter({ filter }: ConditionFilterChangePayload) {
  terms.value = (filter.terms || []) as Query['terms']
}
const rowKey = (row: ActivitySummary) => row.activity.id
</script>
<template>
  <FinancePage fixed>
    <ProjectScopeBar />
    <section class="finance-workspace activity-workspace">
      <div class="finance-toolbar">
        <j-permission-button
          type="primary"
          hasPermission="charging/FinanceActivity:save"
          :disabled="!projectId || saving || uploading"
          @click="select(undefined, false)"
        >
          <AIcon type="PlusOutlined" />
          {{ t('Activity.create') }}
        </j-permission-button>
        <ActivityReview
          v-if="projectId"
          :project-id="projectId"
          @saved="reload"
        />
      </div>
      <ConditionFilter
        class="activity-filter"
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
        class="activity-table"
        :scroll="{ x: 1450, y: 'auto' }"
        @request-error="notify"
      >
        <template #name="row">
          <a-button
            type="link"
            class="finance-company-name"
            @click="select(row.activity.id)"
          >
            {{ row.activity.name }}
          </a-button>
        </template>
        <template #period="row">{{ row.activity.startDate }} ~ {{ row.activity.endDate }}</template>
        <template #reviewState="row">
          <a-tag
            :color="
              row.activity.reviewState === 'APPROVED'
                ? 'green'
                : row.activity.reviewState === 'REJECTED'
                ? 'red'
                : 'orange'
            "
          >
            {{ t('SettingReview.states.' + row.activity.reviewState) }}
          </a-tag>
        </template>
        <template #state="row">
          <a-tag :color="row.activity.enabled ? 'green' : undefined">
            {{ t(row.activity.enabled ? 'Activity.enabled' : 'Activity.disabled') }}
          </a-tag>
        </template>
        <template #runtimeStatus="row">
          <a-tag :color="row.runtimeStatus === 'RUNNING' ? 'blue' : undefined">
            {{ t('Activity.' + row.runtimeStatus) }}
          </a-tag>
        </template>
        <template #actions="row">
          <ActivityActions
            :row="row"
            :busy="saving || uploading"
            @detail="select(row.activity.id)"
            @edit="select(row.activity.id, false)"
            @history="history = row"
            @state="change(row)"
            @delete="change(row, true)"
            @date="(extend) => (dateChange = { row, extend })"
          />
        </template>
        <template #emptyText><CloudEmpty :description="t('Activity.empty')" /></template>
      </j-pro-table>
      <CloudEmpty
        v-else
        :description="t('ProjectContext.selectHint')"
      />
    </section>
    <JlDrawerShell
      :open="open"
      :width="840"
      icon="GiftOutlined"
      :title="t(readOnly ? 'Activity.detail' : detail ? 'Activity.edit' : 'Activity.create')"
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
      <ActivityDetail
        v-else-if="readOnly && detail"
        :detail="detail"
      />
      <ActivityEditor
        v-else-if="open && !readOnly"
        :detail="detail"
        :options="options"
        :saving="saving"
        @save="save"
        @cancel="close"
        @busy="(value) => (uploading = value)"
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
      :width="760"
      icon="HistoryOutlined"
      :title="t('Activity.logs')"
      :sub="history.activity.name"
      @update:open="history = undefined"
    >
      <ActivityHistory
        :project-id="projectId"
        :id="history.activity.id"
      />
      <template #foot>
        <a-button @click="history = undefined">{{ t('Finance.close') }}</a-button>
      </template>
    </JlDrawerShell>
    <ActivityDate
      v-if="dateChange"
      :row="dateChange.row"
      :extend="dateChange.extend"
      :saving="saving"
      @save="saveEnd"
      @close="dateChange = undefined"
    />
  </FinancePage>
</template>
<style src="../finance.css"></style>

<style scoped>
.activity-workspace {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.activity-workspace > :not(.activity-table) {
  flex-shrink: 0;
}
.activity-filter {
  margin-bottom: 20px;
}
.activity-table {
  flex: 1;
  min-height: 0;
  height: auto;
}
.activity-table :deep(.ant-table-container) {
  display: flex;
  flex-direction: column;
}
.activity-table :deep(.ant-table-body) {
  flex: 1;
  min-height: 0;
}
.activity-table :deep(.ant-table-header),
.activity-table :deep(.jtable-pagination) {
  flex-shrink: 0;
}
</style>
