<script setup lang="ts">
import FinancePage from '../components/FinancePage.vue'
import { useI18n } from 'vue-i18n'
import { onlyMessage } from '@jetlinks-web/utils'
import { requestErrorMessage } from '../../../utils/requestError'
import { ref, watch } from 'vue'
import ClosingBatch from './ClosingBatch.vue'
import { useFinanceBatchRecovery } from '../../../hooks/finance-handover/useFinanceBatchRecovery'
import type { ClosingBatchInput, AccountingPeriod, ClosingAction } from '../../../api/financeAccounting'
import { useMonthClosingWorkspace } from '../../../hooks/finance-month-closing/useMonthClosingWorkspace'
import ProjectScopeBar from '../components/ProjectScopeBar.vue'
import PeriodLedger from './PeriodLedger.vue'
import ClosingRule from './ClosingRule.vue'
import AccountingYearEditor from './AccountingYearEditor.vue'
import ClosingConfirmation from './ClosingConfirmation.vue'
import ClosingPeriodDetail from './ClosingPeriodDetail.vue'
const { t } = useI18n()
const state = useMonthClosingWorkspace()
const batchSelected = ref<AccountingPeriod[]>([]),
  batchAction = ref<ClosingAction>(),
  detailOpen = ref(false)
const batchRecovery = useFinanceBatchRecovery<ClosingBatchInput>(state.projectId, 'closing')
watch(
  state.projectId,
  () => {
    batchSelected.value = []
    batchAction.value = undefined
    try {
      const pending = batchRecovery.read()
      if (pending) batchAction.value = pending.action as ClosingAction
    } catch (error) {
      onlyMessage(requestErrorMessage(error, t('Finance.failed')), 'error')
    }
  },
  { immediate: true }
)
const {
  projectId,
  year,
  periods,
  selectedMonth,
  selected,
  loading,
  failed,
  editor,
  ruleOpen,
  target,
  action,
  blocked,
  pending,
  recoveryFailed,
  reload,
  start,
  recover,
  closeAction,
  saved
} = state
function selectPeriod(month: string) {
  selectedMonth.value = month
  detailOpen.value = true
}
function batchSaved() {
  saved()
  batchSelected.value = []
}
function editorSaved() {
  editor.value = undefined
  saved()
}
</script>
<template>
  <FinancePage fixed collection>
    <ProjectScopeBar />
    <div class="month-workspace">
      <div class="month-toolbar">
        <a-space wrap>
          <h2>{{ t('MonthClosing.title') }}</h2>
          <a-input-number
            v-model:value="year"
            :min="1"
            :max="9999"
            :precision="0"
            :disabled="blocked"
            :aria-label="t('MonthClosing.year')"
            :controls="true"
          />
        </a-space>
        <a-space wrap>
          <j-permission-button
            v-for="value in ['CLOSE', 'REOPEN'] as const"
            :key="value"
            :hasPermission="'charging/FinanceMonthClosing:' + value.toLowerCase()"
            :disabled="!projectId || blocked || !batchSelected.length"
            @click="batchAction = value"
          >
            {{ t('MonthClosing.batch.' + value) }}
          </j-permission-button>
          <j-permission-button
            hasPermission="charging/FinanceMonthClosing:save"
            :disabled="!projectId || blocked"
            @click="ruleOpen = true"
          >
            <AIcon type="SettingOutlined" />
            {{ t('MonthClosing.ruleTitle') }}
          </j-permission-button>
          <j-permission-button
            v-if="periods.length"
            hasPermission="charging/FinanceMonthClosing:edit"
            :disabled="blocked || loading"
            @click="editor = 'edit'"
          >
            {{ t('MonthClosing.editYear') }}
          </j-permission-button>
          <j-permission-button
            v-if="!periods.length && !failed"
            hasPermission="charging/FinanceMonthClosing:create"
            type="primary"
            :disabled="!projectId || blocked || loading || !year"
            @click="editor = 'create'"
          >
            {{ t('MonthClosing.createYear') }}
          </j-permission-button>
          <a-button
            :disabled="!projectId || blocked"
            :loading="loading"
            @click="reload"
          >
            <AIcon type="ReloadOutlined" />
            {{ t('Finance.refresh') }}
          </a-button>
        </a-space>
      </div>
      <div
        v-if="pending"
        class="month-recovery"
      >
        <a-alert
          type="warning"
          show-icon
          :message="t('MonthClosing.pending')"
        />
        <a-button
          type="primary"
          @click="recover"
        >
          {{ t('MonthClosing.recover') }}
        </a-button>
      </div>
      <CloudEmpty
        v-if="recoveryFailed"
        :description="t('Document.recoveryUnavailable')"
      />
      <ClosingRule
        :key="projectId"
        v-if="ruleOpen && projectId"
        :project-id="projectId"
        @close="ruleOpen = false"
        @saved="saved"
      />
      <a-spin
        :spinning="loading"
        class="month-loading"
      >
        <CloudEmpty
          v-if="!projectId"
          :description="t('ProjectContext.choose')"
        />
        <CloudEmpty
          v-else-if="failed"
          :description="t('MonthClosing.loadFailed')"
        />
        <CloudEmpty
          v-else-if="!periods.length && !loading"
          :description="t('MonthClosing.noYear', { year })"
        />
        <template v-else-if="periods.length">
          <PeriodLedger
            :periods="periods"
            :selected="selectedMonth"
            :disabled="blocked"
            @select="selectPeriod"
            @selection="batchSelected = $event"
          />
          <ClosingPeriodDetail
            v-if="detailOpen && selected"
            :period="selected"
            :project-id="projectId"
            :blocked="blocked"
            @close="detailOpen = false"
            @action="start(selected, $event)"
          />
        </template>
      </a-spin>
    </div>
    <ClosingBatch
      v-if="batchAction"
      :project-id="projectId"
      :periods="batchSelected"
      :action="batchAction"
      @close="batchAction = undefined"
      @saved="batchSaved"
    />
    <AccountingYearEditor
      v-if="editor"
      :project-id="projectId"
      :year="year"
      :mode="editor"
      :periods="periods"
      @close="editor = undefined"
      @saved="editorSaved"
    />
    <ClosingConfirmation
      v-if="target"
      :project-id="projectId"
      :period="target"
      :action="action"
      @close="closeAction"
      @saved="saved"
    />
  </FinancePage>
</template>
<style scoped>
.month-workspace {
  background: var(--ant-component-background, #fff);
  padding: 24px;
  min-height: 500px;
}
.month-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 24px;
}
.month-toolbar h2 {
  font-size: 20px;
  margin: 0 8px 0 0;
  font-weight: 600;
}
.month-toolbar :deep(.ant-input-number) {
  width: 110px;
}
.month-loading {
  display: block;
  min-height: 220px;
}
.month-detail {
  margin-top: 28px;
}
.month-detail h3 {
  font-size: 15px;
  font-weight: 600;
  margin: 0;
}
.month-guidance {
  color: var(--ant-color-text-secondary, #595959);
  margin: 0;
}
.month-recovery {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 20px;
}
.month-recovery :deep(.ant-alert) {
  flex: 1;
  min-width: 240px;
}
@media (max-width: 640px) {
  .month-workspace {
    padding: 16px 12px;
  }
  .month-toolbar {
    gap: 16px;
  }
}
</style>
