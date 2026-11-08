<script setup lang="ts">
import FinancePage from '../components/FinancePage.vue'
import { useI18n } from 'vue-i18n'
import { ref } from 'vue'
import { useSettingWorkspace, settingPermission } from '../../../hooks/finance-setting/useSettingWorkspace'
import ProjectScopeBar from '../components/ProjectScopeBar.vue'
import SettingTable from './SettingTable.vue'
import SettingDrawer from './SettingDrawer.vue'
import SettingStop from './SettingStop.vue'
import SettingTasks from './SettingTasks.vue'
import SettingReview from './SettingReview.vue'
import SettingCustomerChange from './SettingCustomerChange.vue'
const { t } = useI18n()
const state = useSettingWorkspace()
const tasksOpen = ref(false)
const {
  archive,
  tree,
  options,
  open,
  loading,
  failed,
  saving,
  readOnly,
  mode,
  detail,
  metadataLoading,
  metadataFailed,
  stopTarget,
  select,
  close,
  save,
  stop
} = state
const { projectId, keyword, selectedId, selected, loading: treeLoading, failed: treeFailed } = archive
function selectTree(keys: (string | number)[]) {
  if (keys.length) selectedId.value = String(keys[0])
}
</script>
<template>
  <FinancePage>
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
        <a-spin
          :spinning="treeLoading"
          class="setting-tree"
        >
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
        <div class="subject-content-heading setting-heading">
          <a-space wrap>
            <SettingReview
              :project-id="projectId"
              @saved="state.reload()"
            />
            <a-button
              :disabled="!projectId"
              @click="tasksOpen = true"
            >
              {{ t('Setting.tasks') }}
            </a-button>
            <j-permission-button
              :hasPermission="`${settingPermission}:save`"
              :disabled="!projectId || metadataLoading || metadataFailed"
              @click="select(undefined, false, 'batch')"
            >
              {{ t('Setting.batch') }}
            </j-permission-button>
            <j-permission-button
              :hasPermission="`${settingPermission}:save`"
              type="primary"
              :disabled="!projectId || metadataLoading || metadataFailed"
              @click="select(undefined, false)"
            >
              <AIcon type="PlusOutlined" />
              {{ t('Setting.create') }}
            </j-permission-button>
          </a-space>
        </div>
        <SettingTable :state="state" />
        <CloudEmpty
          v-if="!projectId"
          :description="t('ProjectContext.choose')"
        />
      </main>
    </div>
    <SettingDrawer
      v-if="open && mode !== 'customer'"
      :project-id="projectId"
      :spaces="archive.tree.value"
      :detail="detail"
      :options="options"
      :initial-space="selected?.customerBound ? selected.id : undefined"
      :mode="mode"
      :read-only="readOnly"
      :loading="loading"
      :failed="failed"
      :saving="saving"
      @close="close"
      @save="save"
    />
    <SettingCustomerChange
      v-if="open && mode === 'customer'"
      :project-id="projectId"
      :detail="detail"
      :options="options"
      :loading="loading"
      :failed="failed"
      :saving="saving"
      @close="close"
      @save="save"
    />
    <SettingStop
      v-if="stopTarget"
      :target="stopTarget"
      :saving="saving"
      @close="stopTarget = undefined"
      @save="stop"
    />
    <SettingTasks
      v-if="tasksOpen"
      :project-id="projectId"
      @close="tasksOpen = false"
    />
  </FinancePage>
</template>
<style scoped src="../FinanceSubject/subject.css"></style>
<style scoped>
.setting-heading {
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
}
.subject-content {
  gap: 16px;
}
.setting-heading {
  margin-bottom: 0;
}
.subject-content :deep(.jtable-body-spin) {
  flex: 0 1 auto;
}
.setting-tree {
  margin-top: 12px;
}
.subject-categories :deep(.ant-spin-container) {
  min-height: 260px;
}
</style>
