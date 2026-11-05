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
  project,
  options,
  treeKeyword,
  visibleTree,
  visibleExpandedKeys,
  treeExpandedKeys,
  canCreate,
  selectedSubject,
  treeSelection,
  selectTree,
  metadataLoading,
  open,
  detail,
  loading,
  failed,
  saving,
  readOnly,
  exporting,
  variablesOpen,
  metadata,
  select,
  close,
  retry,
  save,
  exportFile
} = state
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
          <a-input
            v-model:value="treeKeyword"
            class="standard-tree-search"
            allow-clear
            :placeholder="t('Standard.searchTree')"
            :aria-label="t('Standard.searchTree')"
          >
            <template #prefix><AIcon type="SearchOutlined" /></template>
          </a-input>
          <a-tree
            v-if="visibleTree.length"
            :tree-data="visibleTree"
            :selected-keys="treeSelection"
            :expanded-keys="visibleExpandedKeys"
            block-node
            @select="selectTree"
            @expand="(keys) => (treeExpandedKeys = keys.map(String))"
          />
          <CloudEmpty
            v-else
            :description="
              t(
                !projectId
                  ? 'ProjectContext.choose'
                  : treeKeyword.trim()
                    ? 'Subject.noCategoryMatch'
                    : 'Standard.noCategories'
              )
            "
          />
        </a-spin>
      </aside>
      <main class="subject-content">
        <div class="subject-content-heading standard-heading">
          <div>
            <h2>{{ t('Standard.title') }}</h2>
            <span class="subject-caption">
              {{ state.selectedSubjectInfo.value?.name || t('Standard.chooseSubjectFirst') }}
            </span>
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
            <j-permission-button
              :hasPermission="`${standardPermission}:save`"
              type="primary"
              :disabled="!canCreate"
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
      :project-name="project?.name || ''"
      :selected-subject-id="selectedSubject"
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
.standard-tree-search {
  margin-bottom: 16px;
}
</style>
