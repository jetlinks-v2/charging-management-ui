<script setup lang="ts">
import { ref } from 'vue'
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
import './cashier.css'
const { t } = useI18n()
const state = useReceivableWorkspace()
const { archive, tree, open, detail, loading, failed, close } = state
const { projectId, keyword, selectedId, selected, loading: treeLoading } = archive
const selection = state.batch.selected
const collecting = ref<Receivable[]>()
const recovery = useCollectionRecovery(projectId)
const pendingRows = ref<Receivable[]>()
const recoveryFailed = ref(false)
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
useProjectSwitchGuard(() => !collecting.value)
function refresh() {
  void archive.loadTree()
  state.reload()
}
function start() {
  if (selection.value.length && selection.value.length <= 100)
    collecting.value = selection.value.map((row) => ({ ...row }))
}
function collected() {
  pendingRows.value = undefined
  state.batch.clear()
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
          class="cashier-all"
          @click="selectedId = undefined"
        >
          {{ t('Archive.allSpaces') }}
        </a-button>
        <a-spin :spinning="treeLoading">
          <a-tree
            v-if="tree.length"
            :tree-data="tree"
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
          <a-button
            :disabled="!projectId"
            :aria-label="t('Finance.refresh')"
            @click="refresh"
          >
            <AIcon type="ReloadOutlined" />
          </a-button>
        </div>
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
              :disabled="selection.length > 100 || !!pendingRows || recoveryFailed"
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
    <CashierEditor
      v-if="collecting"
      :project-id="projectId"
      :rows="collecting"
      @close="closeEditor"
      @saved="collected"
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
