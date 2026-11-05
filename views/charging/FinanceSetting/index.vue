<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { ref } from 'vue'
import { useSettingWorkspace, settingPermission } from '../../../hooks/finance-setting/useSettingWorkspace'
import ProjectScopeBar from '../components/ProjectScopeBar.vue'
import SettingTable from './SettingTable.vue'
import SettingDrawer from './SettingDrawer.vue'
import SettingStop from './SettingStop.vue'
import SettingTasks from './SettingTasks.vue'
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
  metadata,
  reload,
  select,
  close,
  save,
  stop
} = state
const { projectId, keyword, selectedId, selected, loading: treeLoading, failed: treeFailed } = archive
function refresh() {
  void metadata()
  void archive.loadTree()
  reload()
}
function selectTree(keys: (string | number)[]) {
  selectedId.value = keys.length ? String(keys[0]) : undefined
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
          class="setting-all"
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
        <div class="subject-content-heading setting-heading">
          <div>
            <h2>{{ t('Setting.title') }}</h2>
            <span class="subject-caption">{{ selected?.spaceLocation || t('Setting.hint') }}</span>
          </div>
          <a-space wrap>
            <a-button
              :disabled="!projectId"
              @click="tasksOpen = true"
            >
              {{ t('Setting.tasks') }}
            </a-button>
            <a-button
              :disabled="!projectId"
              :aria-label="t('Finance.refresh')"
              @click="refresh"
            >
              <AIcon type="ReloadOutlined" />
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
      v-if="open"
      :project-id="projectId"
      :detail="detail"
      :options="options"
      :initial-space="selected?.leaf ? selected.id : undefined"
      :mode="mode"
      :read-only="readOnly"
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
  </j-page-container>
</template>
<style scoped src="../FinanceSubject/subject.css"></style>
<style scoped>
.setting-heading {
  flex-wrap: wrap;
}
.setting-all {
  margin: 12px 0;
}
.subject-categories :deep(.ant-spin-container) {
  min-height: 260px;
}
</style>
