<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { FullPage } from '@jetlinks-web-core/layout'
import OrganizationDetail from './OrganizationDetail.vue'
import { organizationPermission, useOrganizationType } from '../../../hooks/useOrganizationType'

const { t } = useI18n()
const key = 'OrganizationType.'
const { types, status, keyword, unmarkedOnly, selectedId, expandedKeys, detail, loading, failed,
  statusFailed, detailLoading, detailFailed, saving, organizations, visibleTree, unmarkedCount,
  parentName, syncRunning, editable, dateText, select, refreshStatus, reload, save, synchronize } = useOrganizationType()
const onSelect = (keys: (string | number)[]) => { if (keys.length) void select(String(keys[0])) }
</script>

<template>
  <j-page-container>
    <FullPage hasPadding transparentBackground>
      <div class="organization-workspace">
        <header class="organization-toolbar">
          <h1>{{ t(key + 'title') }}</h1>
          <div class="organization-toolbar__actions">
            <span class="organization-sync-time">{{ t(key + 'lastSync') }}：{{ dateText(status?.lastSuccessTime) }}</span>
            <a-button :disabled="loading || saving || syncRunning" @click="reload(); refreshStatus()">
              {{ t(key + 'refresh') }}
            </a-button>
            <j-permission-button :hasPermission="`${organizationPermission}:sync`" type="primary"
              :loading="syncRunning" :disabled="loading || saving" @click="synchronize">
              {{ t(key + 'sync') }}
            </j-permission-button>
          </div>
        </header>
        <a-alert v-if="failed" type="error" show-icon :message="t(key + 'loadFailed')">
          <template #action><a-button size="small" @click="reload">{{ t(key + 'retry') }}</a-button></template>
        </a-alert>
        <a-alert v-if="statusFailed || (status?.lastFailureTime && (!status.lastSuccessTime || status.lastFailureTime > status.lastSuccessTime))"
          type="warning" show-icon :message="t(key + (statusFailed ? 'statusFailed' : 'syncFailed'))">
          <template #action><a-button size="small" @click="refreshStatus">{{ t(key + 'refreshStatus') }}</a-button></template>
        </a-alert>
        <div class="organization-panels">
          <aside class="organization-tree">
            <h2>{{ t(key + 'tree') }}</h2>
            <a-input v-model:value="keyword" :placeholder="t(key + 'search')" :aria-label="t(key + 'search')" allow-clear />
            <a-checkbox v-model:checked="unmarkedOnly">{{ t(key + 'unmarkedOnly') }}</a-checkbox>
            <a-spin :spinning="loading" class="organization-tree__body">
              <a-tree v-if="visibleTree.length" :tree-data="visibleTree" :selected-keys="selectedId ? [selectedId] : []"
                v-model:expandedKeys="expandedKeys" :auto-expand-parent="false" block-node :disabled="saving"
                @select="onSelect">
                <template #title="node">
                  <div class="organization-tree__node" :class="{ 'organization-tree__context': node.contextOnly }">
                    <span class="organization-tree__name" :title="node.name">{{ node.name }}</span>
                    <a-tag v-if="node.organizationType" :color="node.organizationType.value === 'project' ? 'blue' : 'purple'">
                      {{ node.organizationType.text }}
                    </a-tag>
                    <span v-else class="organization-tree__unmarked">{{ t(key + 'unmarked') }}</span>
                  </div>
                </template>
              </a-tree>
              <a-empty v-else-if="!loading" :description="t(key + (organizations.length ? 'noMatches' : failed ? 'loadFailed' : 'empty'))">
                <a-button v-if="organizations.length" @click="keyword = ''; unmarkedOnly = false">{{ t(key + 'clearFilter') }}</a-button>
              </a-empty>
            </a-spin>
            <footer>{{ t(key + 'counts', { total: organizations.length, unmarked: unmarkedCount }) }}</footer>
          </aside>
          <main class="organization-content" :aria-busy="detailLoading || saving">
            <a-spin :spinning="detailLoading">
              <a-result v-if="detailFailed" status="warning" :title="t(key + 'detailFailed')">
                <template #extra><a-button @click="select(selectedId)">{{ t(key + 'retry') }}</a-button></template>
              </a-result>
              <OrganizationDetail v-else-if="detail" :organization="detail" :date-text="dateText"
                :state="{ editable, saving, types, parentName }" @save="save" />
              <a-empty v-else-if="!detailLoading" class="organization-content__empty" :description="t(key + 'selectOrganization')" />
            </a-spin>
          </main>
        </div>
      </div>
    </FullPage>
  </j-page-container>
</template>

<style scoped>
.organization-workspace { display: flex; flex-direction: column; gap: 16px; min-height: 100%; }
.organization-toolbar { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px; }
.organization-toolbar h1 { font-size: 20px; margin: 0; }
.organization-toolbar__actions { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.organization-sync-time { font-size: 12px; color: var(--color-jet-text-secondary, #777); }
.organization-panels { flex: 1; display: grid; grid-template-columns: minmax(280px, 340px) minmax(0, 1fr); min-height: 560px; background: var(--color-jet-bg-white, #fff); border-radius: 6px; }
.organization-tree { padding: 20px 16px 0; display: flex; flex-direction: column; gap: 16px; border-right: 1px solid var(--color-jet-border, #eee); min-width: 0; }
.organization-tree h2 { font-size: 15px; margin: 0; }
.organization-tree__body { flex: 1; min-height: 280px; }
.organization-tree__body :deep(.ant-tree) { max-height: calc(100vh - 340px); min-height: 280px; overflow: auto; }
.organization-tree__body :deep(.ant-tree-title) { display: block; }
.organization-tree__body :deep(.ant-tree-node-content-wrapper) { min-width: 0; }
.organization-tree__node { display: flex; align-items: center; gap: 8px; min-height: 32px; }
.organization-tree__name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.organization-tree__node :deep(.ant-tag) { margin: 0; font-size: 11px; }
.organization-tree__unmarked { white-space: nowrap; color: var(--color-jet-text-secondary, #777); font-size: 11px; }
.organization-tree__context .organization-tree__name { color: var(--color-jet-text-secondary, #777); }
.organization-tree footer { border-top: 1px solid var(--color-jet-border, #eee); padding: 14px 0; font-size: 12px; color: var(--color-jet-text-secondary, #777); }
.organization-content { min-width: 0; }
.organization-content__empty { padding: 150px 16px; }
@media (max-width: 700px) {
  .organization-toolbar__actions { gap: 8px; }
  .organization-sync-time { width: 100%; }
  .organization-panels { grid-template-columns: 1fr; }
  .organization-tree { border-right: none; border-bottom: 1px solid var(--color-jet-border, #eee); }
  .organization-tree__body :deep(.ant-tree) { min-height: 200px; max-height: 320px; }
  .organization-content__empty { padding: 60px 16px; }
}
</style>
