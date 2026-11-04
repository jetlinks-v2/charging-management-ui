<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { onlyMessage } from '@jetlinks-web/utils'
import { useProjectContext } from '../../../hooks/project/useProjectContext'
import ProjectPicker from './ProjectPicker.vue'
const { t } = useI18n()
const context = useProjectContext()
const { projects, projectId, current, loading, failed, switching } = context
const open = ref(false)
const organizationPath = computed(() => current.value?.organizationPath?.map((item) => item.name).join(' / '))
async function refresh() {
  try {
    await context.refresh()
  } catch {
    onlyMessage(t('ProjectContext.failed'), 'error')
  }
}
async function choose() {
  open.value = true
  await refresh()
}
async function confirm(id: string) {
  if (await context.select(id)) open.value = false
  else onlyMessage(t('ProjectContext.switchBlocked'), 'warning')
}
</script>
<template>
  <div class="project-scope-bar">
    <span class="project-scope-bar__label">{{ t('ProjectContext.currentProject') }}</span>
    <a-button
      :loading="loading"
      class="project-scope-bar__trigger"
      @click="choose"
    >
      <AIcon type="EnvironmentOutlined" />
      <strong>{{ current?.name || t('ProjectContext.choose') }}</strong>
      <AIcon type="DownOutlined" />
    </a-button>
    <span
      v-if="organizationPath"
      class="project-scope-bar__path"
      :title="organizationPath"
    >
      {{ organizationPath }}
    </span>
    <div class="project-scope-bar__actions"><slot /></div>
  </div>
  <ProjectPicker
    :open="open"
    :projects="projects"
    :current-id="projectId"
    :loading="loading"
    :failed="failed"
    :switching="switching"
    @close="open = false"
    @confirm="confirm"
    @refresh="refresh"
  />
</template>
<style scoped>
.project-scope-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  padding: 12px 16px;
  background: var(--panel-background, #fff);
  border: 1px solid var(--line, #f0f0f0);
  border-radius: var(--r-3, 6px);
}
.project-scope-bar__label {
  color: var(--ink-3, #595959);
  font-size: 13px;
}
.project-scope-bar__trigger {
  display: flex;
  align-items: center;
  gap: 10px;
  max-width: 320px;
}
.project-scope-bar__trigger strong {
  font-weight: 500;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.project-scope-bar__path {
  flex: 1;
  min-width: 0;
  color: var(--ink-3, #595959);
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.project-scope-bar__actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  margin-left: auto;
}
@media (max-width: 680px) {
  .project-scope-bar__path {
    display: none;
  }
}
</style>
