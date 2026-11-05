<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useReceivableWorkspace } from '../../../hooks/finance-receivable/useReceivableWorkspace'
import { useProjectSwitchGuard } from '../../../hooks/project/useProjectContext'
import { useCollectionRecovery } from '../../../hooks/finance-cashier/useCollectionRecovery'
import { onlyMessage } from '@jetlinks-web/utils'
import { watch } from 'vue'
import type { Receivable } from '../../../api/financeReceivable'
import ProjectScopeBar from '../components/ProjectScopeBar.vue'
import ReceivableTable from '../FinanceReceivable/ReceivableTable.vue'
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
const state = useReceivableWorkspace()
const { archive, tree, open, detail, loading, failed, close } = state
const { projectId, keyword, selectedId, selected, loading: treeLoading } = archive
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
const selection = state.batch.selected
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
function refresh() {
  void archive.loadTree()
  state.reload()
}
function start() {
  if (!busy.value && selection.value.length && selection.value.length <= 100)
    collecting.value = selection.value.map((row) => ({ ...row }))
}
function collected() {
  pendingRows.value = undefined
  state.batch.clear()
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
  <j-page-container>
    <ProjectScopeBar />
    <div class="subject-workspace">
      <aside class="subject-categories">
        <div class="subject-tree-heading">
          <strong>{{ t('Setting.spaceTree') }}</strong>
        </div>
        <a-input
          v-model:value="keyword"
          :placeholder="t('Archive.searchSpace')"
          :aria-label="t('Archive.searchSpace')"
          allow-clear
        />
        <a-button
          block
          :type="selectedId ? 'text' : 'primary'"
          :ghost="!selectedId"
          :disabled="busy"
          class="cashier-all"
          @click="selectedId = undefined"
        >
          {{ t('Archive.allSpaces') }}
        </a-button>
        <a-spin :spinning="treeLoading">
          <a-tree
            v-if="tree.length"
            :tree-data="tree"
            :disabled="busy"
            :selected-keys="selectedId ? [selectedId] : []"
            default-expand-all
            block-node
            @select="(keys) => (selectedId = keys.length ? String(keys[0]) : undefined)"
          />
          <CloudEmpty
            v-else-if="!treeLoading"
            :description="t('Archive.noSpaces')"
          />
        </a-spin>
      </aside>
      <main class="subject-content">
        <div class="subject-content-heading">
          <div>
            <h2>{{ t('Cashier.title') }}</h2>
            <span class="subject-caption">{{ selected?.spaceLocation || t('Cashier.scopeHint') }}</span>
          </div>
          <CashierTools
            :project-id="projectId"
            :busy="busy"
            :leaf="!!selected?.leaf"
            @temporary="temporary.start(selected?.leaf ? selectedId : undefined)"
            @topup="
              (type) => funds.start({ action: 'TOPUP', type, initialSpace: selected?.leaf ? selectedId : undefined })
            "
            @prepay="prepay.start(selectedId || '', selected?.spaceLocation || selected?.name || '')"
            @refresh="refresh"
          />
        </div>
        <a-alert
          v-if="prepayPending"
          type="warning"
          show-icon
          :message="t('Prepay.pending')"
          class="cashier-pending"
        >
          <template #action>
            <a-button @click="prepay.recover">{{ t('Cashier.retry') }}</a-button>
          </template>
        </a-alert>
        <a-alert
          v-if="temporaryPending"
          type="warning"
          show-icon
          :message="t('Temporary.pending')"
          class="cashier-pending"
        >
          <template #action>
            <a-button @click="temporary.recover">{{ t('Cashier.retry') }}</a-button>
          </template>
        </a-alert>
        <a-alert
          v-if="fundPending"
          type="warning"
          show-icon
          :message="t('Funds.pending')"
          class="cashier-pending"
        >
          <template #action>
            <a-button @click="funds.recover">{{ t('Cashier.retry') }}</a-button>
          </template>
        </a-alert>
        <a-alert
          v-if="pendingRows"
          type="warning"
          show-icon
          class="cashier-pending"
          :message="t('Cashier.pending')"
        >
          <template #action>
            <a-button @click="collecting = pendingRows">{{ t('Cashier.retry') }}</a-button>
          </template>
        </a-alert>
        <div
          v-if="selection.length"
          class="cashier-selected"
        >
          <span>{{ t('Receivable.selectedCount', { count: selection.length }) }}</span>
          <a-space>
            <a-button
              type="link"
              @click="state.batch.clear()"
            >
              {{ t('Receivable.clearSelection') }}
            </a-button>
            <j-permission-button
              type="primary"
              hasPermission="charging/FinanceCashier:collect"
              :disabled="selection.length > 100 || busy"
              @click="start"
            >
              <AIcon type="WalletOutlined" />
              {{ t('Cashier.collect') }}
            </j-permission-button>
          </a-space>
        </div>
        <ReceivableTable
          :state="state"
          cashier
        />
        <CloudEmpty
          v-if="!projectId"
          :description="t('ProjectContext.choose')"
        />
      </main>
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
  </j-page-container>
</template>
<style scoped src="../FinanceSubject/subject.css"></style>
<style scoped>
.cashier-all {
  margin: 12px 0;
}
.subject-categories :deep(.ant-spin-container) {
  min-height: 260px;
}
</style>
