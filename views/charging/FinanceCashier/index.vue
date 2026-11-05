<script setup lang="ts">
import FinancePage from '../components/FinancePage.vue'
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useCashierWorkspace } from '../../../hooks/finance-cashier/useCashierWorkspace'
import { useProjectSwitchGuard } from '../../../hooks/project/useProjectContext'
import { useCollectionRecovery } from '../../../hooks/finance-cashier/useCollectionRecovery'
import { onlyMessage } from '@jetlinks-web/utils'
import { watch } from 'vue'
import type { Receivable } from '../../../api/financeReceivable'
import ProjectScopeBar from '../components/ProjectScopeBar.vue'
import CashierSpaceTree from './CashierSpaceTree.vue'
import CashierWorkbench from './CashierWorkbench.vue'
import CashierSummary from './CashierSummary.vue'
import './workbench.css'
import ReceivableDetail from '../FinanceReceivable/ReceivableDetail.vue'
import CashierEditor from './CashierEditor.vue'
import CashierTools from './CashierTools.vue'
import PrepayEditor from './prepay/PrepayEditor.vue'
import { usePrepayFlow } from '../../../hooks/finance-prepay/usePrepayFlow'
import './cashier.css'
import FundEditor from '../FinanceFunds/FundEditor.vue'
import { useFundFlow } from '../../../hooks/finance-funds/useFundFlow'
import { useTemporaryFlow } from '../../../hooks/finance-temporary/useTemporaryFlow'
import TemporaryEditor from '../FinanceTemporary/TemporaryEditor.vue'
const { t } = useI18n()
const state = useCashierWorkspace()
const { archive, open, detail, detailLoading: loading, detailFailed: failed, close } = state
const { projectId, selectedId, selected } = archive
const temporary = useTemporaryFlow(projectId)
const {
  open: temporaryOpen,
  pending: temporaryPending,
  failed: temporaryFailed,
  initialSpace: temporarySpace
} = temporary
const prepay = usePrepayFlow(projectId)
const {
  open: prepayOpen,
  pending: prepayPending,
  failed: prepayFailed,
  spaceId: prepaySpace,
  spaceName: prepayName
} = prepay
const funds = useFundFlow(projectId)
const { draft: fundDraft, pending: fundPending, failed: fundFailed } = funds
const selection = state.selected
const collecting = ref<Receivable[]>()
const recovery = useCollectionRecovery(projectId)
const pendingRows = ref<Receivable[]>()
const recoveryFailed = ref(false)
const busy = computed(
  () =>
    !!collecting.value ||
    prepayOpen.value ||
    prepayPending.value ||
    prepayFailed.value ||
    open.value ||
    !!fundDraft.value ||
    temporaryOpen.value ||
    fundPending.value ||
    fundFailed.value ||
    temporaryPending.value ||
    temporaryFailed.value ||
    !!pendingRows.value ||
    recoveryFailed.value
)
function readPending() {
  recoveryFailed.value = false
  try {
    pendingRows.value = projectId.value ? recovery.read()?.preview.rows : undefined
  } catch {
    recoveryFailed.value = true
    onlyMessage(t('Cashier.recoveryUnavailable'), 'error')
  }
}
watch(projectId, readPending, { immediate: true })
function closeEditor() {
  collecting.value = undefined
  readPending()
}
useProjectSwitchGuard(() => !collecting.value && !pendingRows.value && !recoveryFailed.value)
function start() {
  if (!busy.value && selection.value.length && selection.value.length <= 100)
    collecting.value = selection.value.map((row) => ({ ...row }))
}
function collected() {
  pendingRows.value = undefined
  state.clear()
  state.reload()
}
function temporarySaved() {
  temporary.saved()
  state.reload()
}
function fundSaved() {
  funds.saved()
  state.reload()
}
</script>
<template>
  <FinancePage fixed>
    <ProjectScopeBar />
    <div
      class="cashier-workspace"
      :class="{ 'cashier-workspace-records': state.tab.value === 'records' }"
    >
      <CashierSpaceTree
        :state="state"
        :busy="busy"
      />
      <CashierWorkbench
        :state="state"
        :busy="busy"
      >
        <template #tools>
          <CashierTools
            :project-id="projectId"
            :busy="busy"
            :leaf="!!selected?.leaf"
            @temporary="temporary.start(selected?.leaf ? selectedId : undefined)"
            @topup="
              (type) => funds.start({ action: 'TOPUP', type, initialSpace: selected?.leaf ? selectedId : undefined })
            "
            @prepay="prepay.start(selectedId || '', selected?.spaceLocation || selected?.name || '')"
          />
        </template>
      </CashierWorkbench>
      <CashierSummary
        v-if="state.tab.value === 'collect'"
        :state="state"
        :busy="busy"
        @collect="start"
      />
    </div>
    <div
      v-if="pendingRows || prepayPending || temporaryPending || fundPending"
      class="cashier-pending-actions"
    >
      <a-button
        v-if="pendingRows"
        @click="collecting = pendingRows"
      >
        {{ t('Cashier.retry') }}
      </a-button>
      <a-button
        v-if="prepayPending"
        @click="prepay.recover"
      >
        {{ t('Prepay.pending') }}
      </a-button>
      <a-button
        v-if="temporaryPending"
        @click="temporary.recover"
      >
        {{ t('Temporary.pending') }}
      </a-button>
      <a-button
        v-if="fundPending"
        @click="funds.recover"
      >
        {{ t('Funds.pending') }}
      </a-button>
    </div>
    <ReceivableDetail
      v-if="open"
      :project-id="projectId"
      :detail="detail"
      :loading="loading"
      :failed="failed"
      @close="close"
      @source="(id) => state.select({ id })"
    />
    <PrepayEditor
      v-if="prepayOpen"
      :project-id="projectId"
      :space-id="prepaySpace"
      :space-name="prepayName"
      @close="prepay.close"
      @saved="
        () => {
          prepay.saved()
          state.reload()
        }
      "
    />
    <CashierEditor
      v-if="collecting"
      :project-id="projectId"
      :rows="collecting"
      @close="closeEditor"
      @saved="collected"
    />
    <TemporaryEditor
      v-if="temporaryOpen"
      :project-id="projectId"
      :initial-space="temporarySpace"
      @close="temporary.close"
      @saved="temporarySaved"
    />
    <FundEditor
      v-if="fundDraft"
      :project-id="projectId"
      :draft="fundDraft"
      @close="funds.close"
      @saved="fundSaved"
    />
  </FinancePage>
</template>
