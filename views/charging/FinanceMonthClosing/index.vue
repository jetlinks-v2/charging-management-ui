<script setup lang="ts">
import FinancePage from '../components/FinancePage.vue'
import { useI18n } from 'vue-i18n'
import { useMonthClosingWorkspace } from '../../../hooks/finance-month-closing/useMonthClosingWorkspace'
import ProjectScopeBar from '../components/ProjectScopeBar.vue'
import PeriodLedger from './PeriodLedger.vue'
import ClosingRule from './ClosingRule.vue'
import AccountingYearEditor from './AccountingYearEditor.vue'
import ClosingConfirmation from './ClosingConfirmation.vue'
import ClosingRecords from './ClosingRecords.vue'
const { t } = useI18n()
const state = useMonthClosingWorkspace()
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
function editorSaved() {
  editor.value = undefined
  saved()
}
</script>
<template>
  <FinancePage>
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
            @select="selectedMonth = $event"
          />
          <SectionCard
            v-if="selected"
            icon="CalendarOutlined"
            :title="selected.accountMonth"
            :sub="selected.startDate + ' ~ ' + selected.endDate"
            class="month-detail"
          >
            <template #actions>
              <j-permission-button
                :type="selected.status === 'OPEN' ? 'primary' : 'default'"
                :danger="selected.status === 'CLOSED'"
                :hasPermission="'charging/FinanceMonthClosing:' + (selected.status === 'OPEN' ? 'close' : 'reopen')"
                :disabled="blocked"
                @click="start(selected, selected.status === 'OPEN' ? 'CLOSE' : 'REOPEN')"
              >
                {{ t('MonthClosing.action.' + (selected.status === 'OPEN' ? 'CLOSE' : 'REOPEN')) }}
              </j-permission-button>
            </template>
            <p class="month-guidance">
              {{ t(selected.status === 'OPEN' ? 'MonthClosing.openHint' : 'MonthClosing.closedHint') }}
            </p>
            <h3>{{ t('MonthClosing.logs') }}</h3>
            <ClosingRecords
              :key="projectId + selected.accountMonth"
              :project-id="projectId"
              :month="selected.accountMonth"
            />
          </SectionCard>
        </template>
      </a-spin>
    </div>
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
