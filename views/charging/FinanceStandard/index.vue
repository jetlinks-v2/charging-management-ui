<script setup lang="ts">
import FinancePage from '../components/FinancePage.vue'
import { useI18n } from 'vue-i18n'
import { useStandardWorkspace, standardPermission } from '../../../hooks/finance-standard/useStandardWorkspace'
import ProjectScopeBar from '../components/ProjectScopeBar.vue'
import StandardTable from './StandardTable.vue'
import StandardDrawer from './StandardDrawer.vue'
import VariableDrawer from './VariableDrawer.vue'
const { t } = useI18n()
const state = useStandardWorkspace()
const {
  projectId,
  options,
  tree,
  selectedCategory,
  selectedSubject,
  treeSelection,
  selectTree,
  metadataLoading,
  metadataFailed,
  open,
  detail,
  loading,
  failed,
  saving,
  readOnly,
  exporting,
  variablesOpen,
  metadata,
  reload,
  select,
  close,
  retry,
  save,
  exportFile
} = state
function refresh() {
  void metadata()
  reload()
}
</script>
<template>
  <FinancePage>
    <ProjectScopeBar />
    <div class="subject-workspace">
      <aside class="subject-categories">
        <div class="subject-tree-heading">
          <strong>{{ t('Subject.categories') }}</strong>
        </div>
        <a-spin :spinning="metadataLoading">
          <a-button
            block
            :type="!selectedCategory && !selectedSubject ? 'primary' : 'text'"
            :ghost="!selectedCategory && !selectedSubject"
            @click="selectTree([])"
          >
            {{ t('Subject.allCategories') }}
          </a-button>
          <a-tree
            v-if="tree.length"
            :tree-data="tree"
            :selected-keys="treeSelection"
            default-expand-all
            block-node
            @select="selectTree"
          />
          <CloudEmpty
            v-else
            :description="t(projectId ? 'Standard.noCategories' : 'ProjectContext.choose')"
          />
        </a-spin>
      </aside>
      <main class="subject-content">
        <div class="subject-content-heading standard-heading">
          <div>
            <h2>{{ t('Standard.title') }}</h2>
            <span class="subject-caption">{{ t('Standard.hint') }}</span>
          </div>
          <a-space wrap>
            <j-permission-button
              :hasPermission="`${standardPermission}:variables`"
              :disabled="!projectId || metadataLoading"
              @click="variablesOpen = true"
            >
              {{ t('Standard.variables') }}
            </j-permission-button>
            <j-permission-button
              :hasPermission="`${standardPermission}:export`"
              :disabled="!projectId"
              :loading="exporting"
              @click="exportFile"
            >
              {{ t('Archive.export') }}
            </j-permission-button>
            <a-button
              :disabled="!projectId"
              :aria-label="t('Finance.refresh')"
              @click="refresh"
            >
              <AIcon type="ReloadOutlined" />
            </a-button>
            <j-permission-button
              :hasPermission="`${standardPermission}:save`"
              type="primary"
              :disabled="!projectId || metadataLoading || metadataFailed"
              @click="select(undefined, false)"
            >
              {{ t('Standard.create') }}
            </j-permission-button>
          </a-space>
        </div>
        <StandardTable :state="state" />
      </main>
    </div>
    <StandardDrawer
      v-if="open"
      :open="open"
      :detail="detail"
      :options="options"
      :project-id="projectId"
      :state="{ loading, failed, saving, readOnly }"
      @close="close"
      @save="save"
      @retry="retry"
    />
    <VariableDrawer
      v-if="variablesOpen"
      :open="variablesOpen"
      :project-id="projectId"
      @close="variablesOpen = false"
      @changed="metadata"
    />
  </FinancePage>
</template>
<style scoped src="../FinanceSubject/subject.css"></style>
<style scoped>
.standard-heading {
  flex-wrap: wrap;
}
.subject-categories :deep(.ant-spin-container) {
  min-height: 260px;
}
</style>
