<script setup lang="ts">
import FinancePage from '../components/FinancePage.vue'
import { computed } from 'vue'
import { Grid } from 'ant-design-vue'
import ConditionFilter, { type ConditionFilterChangePayload } from '@jetlinks-web-core/components/ConditionFilter'
import type { Query } from '../../../api/archive'
import { useHandoverWorkspace } from '../../../hooks/finance-handover/useHandoverWorkspace'
import ProjectScopeBar from '../components/ProjectScopeBar.vue'
import HandoverSources from './HandoverSources.vue'
import HandoverEditor from './HandoverEditor.vue'
import HandoverAction from './HandoverAction.vue'
import HandoverDetail from './HandoverDetail.vue'
import './handover.css'
const state = useHandoverWorkspace()
const {
  t,
  canCreate,
  projectId,
  tab,
  type,
  status,
  selected,
  terms,
  table,
  params,
  request,
  editorOpen,
  detailOpen,
  actionOpen,
  actionTarget,
  actionName,
  targets,
  blocked,
  pendingCreate,
  pendingAction,
  recoveryFailed,
  notify,
  start,
  recover,
  closeEditor,
  closeAction,
  saved,
  act,
  select
} = state
const screens = Grid.useBreakpoint()
const fields = computed(() =>
  ['closingDate', 'submittedBy'].map((key) => ({
    title: t('Handover.' + key),
    dataIndex: key,
    search: { type: 'string' as const }
  }))
)
const columns = computed(() => [
  { title: t('Handover.state'), dataIndex: 'status', width: 120, scopedSlots: true },
  { title: t('Handover.date'), dataIndex: 'closingDate', width: 120 },
  { title: t('Handover.amount'), dataIndex: 'amount', width: 130, align: 'right' },
  { title: t('Handover.cash'), dataIndex: 'cashAmount', width: 130, align: 'right' },
  { title: t('Handover.submitter'), dataIndex: 'submittedBy', width: 130 },
  { title: t('Handover.submittedAt'), dataIndex: 'submittedAt', width: 180, scopedSlots: true },
  {
    title: t('Finance.actions'),
    dataIndex: 'actions',
    width: 290,
    fixed: screens.value.md ? 'right' : undefined,
    scopedSlots: true
  }
])
function filter({ filter }: ConditionFilterChangePayload) {
  terms.value = (filter.terms || []) as Query['terms']
}
</script>
<template>
  <FinancePage>
    <ProjectScopeBar />
    <section class="handover-workspace">
      <div class="handover-toolbar">
        <a-radio-group
          v-model:value="tab"
          :disabled="blocked"
        >
          <a-radio-button
            v-if="canCreate"
            value="sources"
          >
            {{ t('Handover.pending') }}
          </a-radio-button>
          <a-radio-button value="records">{{ t('Handover.records') }}</a-radio-button>
        </a-radio-group>
        <a-space>
          <a-button
            :disabled="!projectId || blocked"
            @click="table?.reload()"
          >
            {{ t('Finance.refresh') }}
          </a-button>
          <j-permission-button
            v-if="tab === 'sources'"
            type="primary"
            hasPermission="charging/FinanceHandover:create"
            :disabled="!projectId || blocked || !selected.length"
            @click="start"
          >
            {{ t('Handover.selected', { count: selected.length }) }}
          </j-permission-button>
        </a-space>
      </div>
      <a-alert
        v-if="pendingCreate || pendingAction || recoveryFailed"
        type="warning"
        show-icon
        :message="t(recoveryFailed ? 'Document.recoveryUnavailable' : 'Handover.pendingRecovery')"
      >
        <template #action>
          <a-button
            v-if="!recoveryFailed"
            @click="recover"
          >
            {{ t('Handover.recover') }}
          </a-button>
        </template>
      </a-alert>
      <template v-if="projectId">
        <template v-if="tab === 'sources'">
          <a-radio-group
            v-model:value="type"
            :disabled="blocked"
            class="handover-source-type"
          >
            <a-radio-button
              v-for="value in ['PAYMENT', 'REFUND', 'FUND']"
              :key="value"
              :value="value"
            >
              {{ t('Handover.source.' + value) }}
            </a-radio-button>
          </a-radio-group>
          <HandoverSources :state="state" />
        </template>
        <template v-else>
          <a-select
            v-model:value="status"
            class="handover-status-filter"
            :aria-label="t('Handover.state')"
            :options="
              ['ALL', 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'].map((value) => ({
                value,
                label: t('Handover.status.' + value)
              }))
            "
          />
          <ConditionFilter
            :fields="fields"
            @change="filter"
          />
          <j-pro-table
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
            :body-style="{ padding: 0 }"
            :scroll="{ x: 1200 }"
            @request-error="notify"
          >
            <template #status="row">
              <a-tag
                :color="row.status === 'APPROVED' ? 'success' : row.status === 'PENDING' ? 'processing' : 'default'"
              >
                {{ t('Handover.status.' + row.status) }}
              </a-tag>
            </template>
            <template #submittedAt="row">{{ row.submittedAt.replace('T', ' ') }}</template>
            <template #actions="row">
              <a-space>
                <a-button
                  type="link"
                  @click="select(row.id)"
                >
                  {{ t('Finance.detail') }}
                </a-button>
                <j-permission-button
                  v-if="row.status === 'PENDING' && !row.monthClosed"
                  type="link"
                  hasPermission="charging/FinanceHandover:approve"
                  :disabled="blocked"
                  @click="act(row, 'APPROVE')"
                >
                  {{ t('Handover.action.APPROVE') }}
                </j-permission-button>
                <a-dropdown
                  v-if="!row.monthClosed && (row.status === 'PENDING' || row.status === 'APPROVED')"
                  :disabled="blocked"
                >
                  <a-button type="link">{{ t('Handover.more') }}</a-button>
                  <template #overlay>
                    <a-menu>
                      <a-menu-item v-if="row.status === 'APPROVED'">
                        <j-permission-button
                          type="text"
                          hasPermission="charging/FinanceHandover:unapprove"
                          @click="act(row, 'UNAPPROVE')"
                        >
                          {{ t('Handover.action.UNAPPROVE') }}
                        </j-permission-button>
                      </a-menu-item>
                      <template v-else>
                        <a-menu-item>
                          <j-permission-button
                            type="text"
                            hasPermission="charging/FinanceHandover:reject"
                            @click="act(row, 'REJECT')"
                          >
                            {{ t('Handover.action.REJECT') }}
                          </j-permission-button>
                        </a-menu-item>
                        <a-menu-item>
                          <j-permission-button
                            type="text"
                            hasPermission="charging/FinanceHandover:cancel"
                            @click="act(row, 'CANCEL')"
                          >
                            {{ t('Handover.action.CANCEL') }}
                          </j-permission-button>
                        </a-menu-item>
                      </template>
                    </a-menu>
                  </template>
                </a-dropdown>
              </a-space>
            </template>
            <template #emptyText><CloudEmpty :description="t('Handover.noRecords')" /></template>
          </j-pro-table>
        </template>
      </template>
      <CloudEmpty
        v-else
        :description="t('ProjectScope.choose')"
      />
    </section>
    <HandoverEditor
      v-if="editorOpen"
      :project-id="projectId"
      :candidates="targets"
      @close="closeEditor"
      @saved="saved"
    />
    <HandoverAction
      v-if="actionOpen && actionTarget"
      :project-id="projectId"
      :batch="actionTarget"
      :action="actionName"
      @close="closeAction"
      @saved="saved"
    />
    <HandoverDetail
      v-if="detailOpen"
      :state="state"
    />
  </FinancePage>
</template>
