<script setup lang="ts">
import FinancePage from '../components/FinancePage.vue'
import { computed, ref, watch } from 'vue'
import ConditionFilter, { type ConditionFilterChangePayload } from '@jetlinks-web-core/components/ConditionFilter'
import type { Query } from '../../../api/archive'
import { useHandoverWorkspace } from '../../../hooks/finance-handover/useHandoverWorkspace'
import ProjectScopeBar from '../components/ProjectScopeBar.vue'
import HandoverSources from './HandoverSources.vue'
import HandoverEditor from './HandoverEditor.vue'
import HandoverAction from './HandoverAction.vue'
import HandoverDetail from './HandoverDetail.vue'
import './handover.css'
import HandoverBatch from './HandoverBatch.vue'
import HandoverRecords from './HandoverRecords.vue'
import { useFinanceBatchRecovery } from '../../../hooks/finance-handover/useFinanceBatchRecovery'
import type { HandoverBatchInput, HandoverRecord } from '../../../api/financeHandover'
const props = defineProps<{ view: 'sources' | 'records' }>()
const state = useHandoverWorkspace(props.view)
const {
  t,
  canCreate,
  projectId,
  tab,
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
const batchSelected = ref<HandoverRecord[]>([]),
  batchAction = ref<'APPROVE' | 'UNAPPROVE'>()
const batchRecovery = useFinanceBatchRecovery<HandoverBatchInput>(projectId, 'handover')
watch(
  projectId,
  () => {
    batchSelected.value = []
    batchAction.value = undefined
    try {
      const pending = batchRecovery.read()
      if (pending && viewIsRecords()) batchAction.value = pending.action as 'APPROVE' | 'UNAPPROVE'
    } catch (error) {
      notify(error)
    }
  },
  { immediate: true }
)
function viewIsRecords() {
  return props.view === 'records'
}
const fields = computed(() =>
  ['closingDate', 'submittedBy'].map((key) => ({
    title: t('FinanceHandover.' + key),
    dataIndex: key,
    search: { type: 'string' as const }
  }))
)

function batchSaved() {
  table.value?.reload()
  batchSelected.value = []
}
function filter({ filter }: ConditionFilterChangePayload) {
  terms.value = (filter.terms || []) as Query['terms']
}
</script>
<template>
  <FinancePage
    fixed
    collection
  >
    <ProjectScopeBar />
    <section class="handover-workspace">
      <div class="handover-toolbar">
        <h2>{{ t(view === 'sources' ? 'FinanceHandover.details' : 'FinanceHandover.records') }}</h2>
        <a-space>
          <template v-if="view === 'records'">
            <j-permission-button
              v-for="action in ['APPROVE', 'UNAPPROVE'] as const"
              :key="action"
              :hasPermission="'charging/FinanceHandoverRecord:' + action.toLowerCase()"
              :disabled="blocked || !batchSelected.length"
              @click="batchAction = action"
            >
              {{ t('FinanceHandover.batch.' + action) }}
            </j-permission-button>
          </template>
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
            {{ t('FinanceHandover.selected', { count: selected.length }) }}
          </j-permission-button>
        </a-space>
      </div>
      <a-alert
        v-if="pendingCreate || pendingAction || recoveryFailed"
        type="warning"
        show-icon
        :message="t(recoveryFailed ? 'Document.recoveryUnavailable' : 'FinanceHandover.pendingRecovery')"
      >
        <template #action>
          <a-button
            v-if="!recoveryFailed"
            @click="recover"
          >
            {{ t('FinanceHandover.recover') }}
          </a-button>
        </template>
      </a-alert>
      <template v-if="projectId">
        <template v-if="tab === 'sources'">
          <HandoverSources :state="state" />
        </template>
        <template v-else>
          <a-select
            v-model:value="status"
            class="handover-status-filter"
            :aria-label="t('FinanceHandover.state')"
            :options="
              ['ALL', 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'].map((value) => ({
                value,
                label: t('FinanceHandover.status.' + value)
              }))
            "
          />
          <ConditionFilter
            class="collection-filter"
            :fields="fields"
            @change="filter"
          />
          <HandoverRecords
            :state="state"
            :selected="batchSelected"
            @selection="batchSelected = $event"
          />
        </template>
      </template>
      <CloudEmpty
        v-else
        :description="t('ProjectScope.choose')"
      />
    </section>
    <HandoverBatch
      v-if="batchAction"
      :project-id="projectId"
      :records="batchSelected"
      :action="batchAction"
      @close="batchAction = undefined"
      @saved="batchSaved"
    />
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
