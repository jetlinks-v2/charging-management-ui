<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useReceivableWorkspace, receivablePermission } from '../../../hooks/finance-receivable/useReceivableWorkspace'
import ProjectScopeBar from '../components/ProjectScopeBar.vue'
import ReceivableTable from './ReceivableTable.vue'
import ReceivableDetail from './ReceivableDetail.vue'
import ReceivableChange from './ReceivableChange.vue'
import ReceivableAdjustment from './ReceivableAdjustment.vue'
import ReceivableSplit from './ReceivableSplit.vue'
const { t } = useI18n()
const state = useReceivableWorkspace()
const {
  archive,
  tree,
  open,
  loading,
  failed,
  detail,
  adjusting,
  splitting,
  actionTarget,
  saving,
  exporting,
  close,
  change,
  exportRows
} = state
const { projectId, keyword, selectedId, selected, loading: treeLoading, failed: treeFailed } = archive
function refresh() {
  void archive.loadTree()
  state.reload()
}
function selectTree(keys: (string | number)[]) {
  selectedId.value = keys.length ? String(keys[0]) : undefined
}
function adjustmentSaved() {
  close()
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
          class="receivable-all"
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
            @select="selectTree"
          />
          <CloudEmpty
            v-else-if="!treeLoading"
            :description="t(treeFailed ? 'Archive.scopeFailed' : 'Archive.noSpaces')"
          />
        </a-spin>
      </aside>
      <main class="subject-content">
        <div class="subject-content-heading receivable-heading">
          <div>
            <h2>{{ t('Receivable.title') }}</h2>
            <span class="subject-caption">{{ selected?.spaceLocation || t('Receivable.scopeHint') }}</span>
          </div>
          <a-space>
            <j-permission-button
              :hasPermission="`${receivablePermission}:export`"
              :disabled="!projectId"
              :loading="exporting"
              @click="exportRows"
            >
              <AIcon type="DownloadOutlined" />
              {{ t('Receivable.export') }}
            </j-permission-button>
            <a-button
              :disabled="!projectId"
              :aria-label="t('Finance.refresh')"
              @click="refresh"
            >
              <AIcon type="ReloadOutlined" />
            </a-button>
          </a-space>
        </div>
        <ReceivableTable :state="state" />
        <CloudEmpty
          v-if="!projectId"
          :description="t('ProjectContext.choose')"
        />
      </main>
    </div>
    <ReceivableDetail
      v-if="open && ((!adjusting && !splitting) || loading || failed)"
      :project-id="projectId"
      :detail="detail"
      :loading="loading"
      :failed="failed"
      @close="close"
      @source="(id) => state.select({ id })"
    />
    <ReceivableAdjustment
      v-if="open && adjusting && detail && !loading && !failed"
      :project-id="projectId"
      :detail="detail"
      @close="close"
      @saved="adjustmentSaved"
    />
    <ReceivableSplit
      v-if="open && splitting && detail && !loading && !failed"
      :project-id="projectId"
      :detail="detail"
      @close="close"
      @saved="adjustmentSaved"
    />
    <ReceivableChange
      v-if="actionTarget"
      :target="actionTarget"
      :saving="saving"
      @close="actionTarget = undefined"
      @save="change"
    />
  </j-page-container>
</template>
<style scoped src="../FinanceSubject/subject.css"></style>
<style scoped>
.receivable-heading {
  flex-wrap: wrap;
}
.receivable-all {
  margin: 12px 0;
}
.subject-categories :deep(.ant-spin-container) {
  min-height: 260px;
}
</style>
