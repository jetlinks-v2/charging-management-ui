<script setup lang="ts">
import FinancePage from '../components/FinancePage.vue'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useReceivableWorkspace, receivablePermission } from '../../../hooks/finance-receivable/useReceivableWorkspace'
import ProjectScopeBar from '../components/ProjectScopeBar.vue'
import ReceivableTable from './ReceivableTable.vue'
import ReceivableDetail from './ReceivableDetail.vue'
import ReceivableChange from './ReceivableChange.vue'
import ReceivableAdjustment from './ReceivableAdjustment.vue'
import ReceivableSplit from './ReceivableSplit.vue'
import HistoricalImports from './HistoricalImports.vue'
import ReceivableChangeAudit from './ReceivableChangeAudit.vue'
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
const projectName = computed(() => archive.projects.value.find((project) => project.id === projectId.value)?.name || '')
function selectTree(keys: (string | number)[]) {
  if (keys.length) selectedId.value = String(keys[0])
}
function adjustmentSaved() {
  close()
  state.reload()
}
</script>
<template>
  <FinancePage fixed>
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
        <ReceivableTable :state="state">
          <template #toolbar>
            <ReceivableChangeAudit
              :project-id="projectId"
              @saved="state.reload()"
            />
            <HistoricalImports
              :project-id="projectId"
              :project-name="projectName"
              @saved="state.reload()"
            />
            <j-permission-button
              :hasPermission="`${receivablePermission}:export`"
              :disabled="!projectId"
              :loading="exporting"
              @click="exportRows"
            >
              <AIcon type="DownloadOutlined" />
              {{ t('Receivable.export') }}
            </j-permission-button>
          </template>
        </ReceivableTable>
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
      :initial-tab="state.detailTab.value"
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
  </FinancePage>
</template>
<style scoped src="../FinanceSubject/subject.css"></style>
<style scoped>
.subject-workspace,
.subject-content {
  min-height: 0;
  overflow: hidden;
}
.subject-categories {
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}
.subject-categories > :not(.ant-spin-nested-loading),
.subject-content > :not(.jtable-body-spin) {
  flex-shrink: 0;
}
.subject-categories :deep(.ant-spin-nested-loading) {
  flex: 1;
  min-height: 0;
  margin-top: 12px;
  overflow: auto;
}
@container (max-width: 650px) {
  .subject-workspace {
    overflow: auto;
  }
  .subject-categories {
    min-height: 180px;
  }
  .subject-content {
    min-height: 400px;
  }
}
</style>
