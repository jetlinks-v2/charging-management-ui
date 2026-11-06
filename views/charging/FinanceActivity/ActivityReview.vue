<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { formatFinanceTime } from '../../../utils/financeTime'
import type { ActivitySummary } from '../../../api/financeActivity'
import { useActivityReview } from '../../../hooks/finance-activity/useActivityReview'
import ActivityReviewDetail from './ActivityReviewDetail.vue'
const props = defineProps<{ projectId: string }>()
const emit = defineEmits<{ saved: [] }>()
const { t } = useI18n()
const state = useActivityReview(props, () => emit('saved'))
const {
  open,
  status,
  keyword,
  search,
  table,
  selected,
  detailOpen,
  busy,
  decision,
  reason,
  targets,
  params,
  request,
  notify,
  show,
  inspect,
  start,
  submit
} = state
const columns = computed(() => [
  { title: t('Activity.reviewState'), dataIndex: 'reviewState', width: 110, scopedSlots: true },
  { title: t('Activity.name'), dataIndex: 'name', width: 210, scopedSlots: true },
  { title: t('Activity.subject'), dataIndex: 'subjectName', width: 140, ellipsis: true },
  { title: t('Activity.standard'), dataIndex: 'standardName', width: 160, ellipsis: true },
  { title: t('Activity.period'), dataIndex: 'period', width: 220, scopedSlots: true },
  { title: t('ChangeAudit.appliedAt'), dataIndex: 'createTime', width: 170, scopedSlots: true },
  { title: t('Finance.actions'), dataIndex: 'actions', width: 210, fixed: 'right', scopedSlots: true }
])
const selection = computed(() => ({
  selectedRowKeys: selected.value.map((row) => row.activity.id),
  onChange: (_keys: string[], rows: ActivitySummary[]) => (selected.value = rows),
  getCheckboxProps: (row: ActivitySummary) => ({ disabled: busy.value || row.activity.reviewState !== 'PENDING' })
}))
</script>
<template>
  <a-button
    :disabled="!projectId"
    @click="show"
  >
    <AIcon type="AuditOutlined" />
    {{ t('Activity.reviewButton') }}
  </a-button>
  <a-modal
    :open="open"
    :title="t('Activity.reviewTitle')"
    :width="1320"
    :style="{ maxWidth: 'calc(100vw - 40px)', top: '24px' }"
    :footer="null"
    :mask-closable="false"
    :closable="!busy && !decision && !detailOpen"
    :keyboard="!busy && !decision && !detailOpen"
    @cancel="open = false"
  >
    <a-tabs v-model:active-key="status">
      <a-tab-pane
        v-for="key in ['PENDING', 'APPROVED', 'REJECTED', 'ALL']"
        :key="key"
        :tab="t('SettingReview.states.' + key)"
      />
    </a-tabs>
    <div class="activity-review-toolbar">
      <a-input-search
        v-model:value="keyword"
        :placeholder="t('Activity.name')"
        allow-clear
        @search="search = keyword.trim()"
      />
      <a-space wrap>
        <j-permission-button
          hasPermission="charging/FinanceActivity:approve"
          type="primary"
          :disabled="!selected.length || selected.length > 100 || busy"
          @click="start('approve')"
        >
          {{ t('HistoricalAudit.batchApprove') }}
        </j-permission-button>
        <j-permission-button
          hasPermission="charging/FinanceActivity:reject"
          danger
          :disabled="!selected.length || selected.length > 100 || busy"
          @click="start('reject')"
        >
          {{ t('HistoricalAudit.batchReject') }}
        </j-permission-button>
      </a-space>
    </div>
    <j-pro-table
      v-if="open"
      ref="table"
      class="activity-review-table"
      mode="TABLE"
      type="PAGE"
      :row-key="(row: ActivitySummary) => row.activity.id"
      :params="params"
      :request="request"
      :columns="columns"
      :row-selection="selection"
      :alert-show="false"
      :pagination="{ pageSize: 12 }"
      :no-pagination="false"
      :scroll="{ x: 1220, y: 'min(360px, calc(100dvh - 390px))' }"
      :body-style="{ padding: 0 }"
      @request-error="notify"
    >
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
      <template #name="row">{{ row.activity.name }}</template>
      <template #period="row">{{ row.activity.startDate }} ~ {{ row.activity.endDate }}</template>
      <template #createTime="row">{{ formatFinanceTime(row.activity.createTime) }}</template>
      <template #actions="row">
        <a-space :size="0">
          <a-button
            type="link"
            size="small"
            :disabled="busy"
            @click="inspect(row)"
          >
            {{ t('Finance.detail') }}
          </a-button>
          <template v-if="row.activity.reviewState === 'PENDING'">
            <j-permission-button
              hasPermission="charging/FinanceActivity:approve"
              type="link"
              size="small"
              :disabled="busy"
              @click="start('approve', [row])"
            >
              {{ t('HistoricalAudit.approve') }}
            </j-permission-button>
            <j-permission-button
              hasPermission="charging/FinanceActivity:reject"
              type="link"
              size="small"
              danger
              :disabled="busy"
              @click="start('reject', [row])"
            >
              {{ t('HistoricalAudit.reject') }}
            </j-permission-button>
          </template>
        </a-space>
      </template>
      <template #emptyText><CloudEmpty :description="t('Activity.reviewEmpty')" /></template>
    </j-pro-table>
  </a-modal>
  <ActivityReviewDetail
    v-if="detailOpen"
    :state="state"
  />
  <a-modal
    :open="!!decision"
    :title="t('HistoricalAudit.' + (decision || 'approve'))"
    :width="600"
    :mask-closable="false"
    :confirm-loading="busy"
    :closable="!busy"
    :keyboard="!busy"
    :cancel-button-props="{ disabled: busy }"
    :ok-button-props="{ disabled: !reason.trim(), danger: decision === 'reject' }"
    @cancel="decision = undefined"
    @ok="submit"
  >
    <div class="activity-review-targets">
      <p
        v-for="row in targets"
        :key="row.activity.id"
      >
        {{ row.activity.name }} · {{ row.standardName }}
      </p>
    </div>
    <a-form layout="vertical">
      <a-form-item
        required
        :label="t('HistoricalAudit.reason')"
      >
        <a-textarea
          v-model:value="reason"
          :disabled="busy"
          :maxlength="1000"
          :rows="4"
          show-count
        />
      </a-form-item>
    </a-form>
  </a-modal>
</template>
<style scoped>
.activity-review-toolbar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
  margin: 4px 0 20px;
}
.activity-review-toolbar > :first-child {
  width: 280px;
  max-width: 100%;
}
.activity-review-toolbar > :last-child {
  margin-left: auto;
}
.activity-review-targets {
  max-height: 160px;
  overflow: auto;
  margin-bottom: 20px;
  overflow-wrap: anywhere;
}
</style>
