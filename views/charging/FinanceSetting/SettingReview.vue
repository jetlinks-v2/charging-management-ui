<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import dayjs from 'dayjs'
import type { ChargeSetting } from '../../../api/financeSetting'
import { useSettingReview } from '../../../hooks/finance-setting/useSettingReview'
import { settingPermission } from '../../../hooks/finance-setting/useSettingWorkspace'
import SettingReviewDetail from './SettingReviewDetail.vue'
const props = defineProps<{ projectId: string }>()
const emit = defineEmits<{ saved: [] }>()
const { t } = useI18n()
const state = useSettingReview(props, () => emit('saved'))
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
  { title: t('SettingReview.state'), dataIndex: 'reviewState', width: 110, scopedSlots: true },
  { title: t('Setting.house'), dataIndex: 'fullName', width: 230, ellipsis: true },
  { title: t('Setting.subject'), dataIndex: 'subjectName', width: 130 },
  { title: t('Setting.standard'), dataIndex: 'standardName', width: 170, ellipsis: true },
  { title: t('Setting.customer'), dataIndex: 'customerName', width: 140, scopedSlots: true },
  { title: t('Setting.validity'), dataIndex: 'validity', width: 210, scopedSlots: true },
  { title: t('ChangeAudit.appliedAt'), dataIndex: 'createTime', width: 170, scopedSlots: true },
  { title: t('Finance.actions'), dataIndex: 'actions', width: 220, fixed: 'right', scopedSlots: true }
])
const selection = computed(() => ({
  selectedRowKeys: selected.value.map((row) => row.id),
  preserveSelectedRowKeys: false,
  onChange: (_keys: string[], rows: ChargeSetting[]) => {
    selected.value = rows
  },
  getCheckboxProps: (row: ChargeSetting) => ({ disabled: busy.value || row.reviewState !== 'PENDING' })
}))
</script>
<template>
  <a-button
    :disabled="!projectId"
    @click="show"
  >
    <AIcon type="AuditOutlined" />
    {{ t('SettingReview.button') }}
  </a-button>
  <a-modal
    :open="open"
    :title="t('SettingReview.title')"
    :width="1440"
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
    <div class="setting-review-toolbar">
      <a-input-search
        v-model:value="keyword"
        :placeholder="t('Archive.searchSpace')"
        allow-clear
        @search="search = keyword.trim()"
      />
      <a-space wrap>
        <j-permission-button
          :hasPermission="`${settingPermission}:approve`"
          type="primary"
          :disabled="!selected.length || selected.length > 100 || busy"
          @click="start('approve')"
        >
          {{ t('HistoricalAudit.batchApprove') }}
        </j-permission-button>
        <j-permission-button
          :hasPermission="`${settingPermission}:reject`"
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
      row-key="id"
      type="PAGE"
      mode="TABLE"
      :columns="columns"
      :params="params"
      :request="request"
      :no-pagination="false"
      :pagination="{ pageSize: 12 }"
      :alert-show="false"
      :row-selection="selection"
      :scroll="{ x: 1380, y: 430 }"
      :body-style="{ padding: 0 }"
      @request-error="notify"
    >
      <template #reviewState="row">
        <a-tag
          :color="row.reviewState === 'APPROVED' ? 'success' : row.reviewState === 'REJECTED' ? 'error' : 'processing'"
        >
          {{ t('SettingReview.states.' + row.reviewState) }}
        </a-tag>
      </template>
      <template #customerName="row">{{ row.customerNames?.join('、') || row.customerName }}</template>
      <template #validity="row">
        {{ row.effectiveStartDate }} ～ {{ row.effectiveEndDate || t('Setting.unlimited') }}
      </template>
      <template #createTime="row">{{ dayjs(row.createTime).format('YYYY-MM-DD HH:mm:ss') }}</template>
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
          <template v-if="row.reviewState === 'PENDING'">
            <j-permission-button
              :hasPermission="`${settingPermission}:approve`"
              type="link"
              size="small"
              :disabled="busy"
              @click="start('approve', [row])"
            >
              {{ t('HistoricalAudit.approve') }}
            </j-permission-button>
            <j-permission-button
              :hasPermission="`${settingPermission}:reject`"
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
      <template #emptyText><CloudEmpty :description="t('SettingReview.empty')" /></template>
    </j-pro-table>
  </a-modal>
  <SettingReviewDetail
    v-if="detailOpen"
    :state="state"
  />
  <a-modal
    :open="!!decision"
    :title="t('HistoricalAudit.' + (decision || 'approve'))"
    :width="640"
    :mask-closable="false"
    :confirm-loading="busy"
    :closable="!busy"
    :keyboard="!busy"
    :cancel-button-props="{ disabled: busy }"
    :ok-button-props="{ disabled: !reason.trim(), danger: decision === 'reject' }"
    @cancel="decision = undefined"
    @ok="submit"
  >
    <div class="setting-review-targets">
      <p
        v-for="row in targets"
        :key="row.id"
      >
        {{ row.fullName }} · {{ row.subjectName }} · {{ row.standardName }}
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
.setting-review-toolbar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  margin: 4px 0 20px;
}
.setting-review-toolbar > :first-child {
  width: 280px;
  max-width: 100%;
}
.setting-review-toolbar > :last-child {
  margin-left: auto;
}
.setting-review-targets {
  max-height: 180px;
  overflow: auto;
  margin: 12px 0 20px;
  line-height: 1.7;
  overflow-wrap: anywhere;
}
</style>
