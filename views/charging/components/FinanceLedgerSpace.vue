<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { TreeProps } from 'ant-design-vue'
import type { useFinanceSpaceScope } from '../../../hooks/finance-setting/useFinanceSpaceScope'
const props = defineProps<{ state: ReturnType<typeof useFinanceSpaceScope> }>()
const { t } = useI18n()
const { selectedId, keyword, visibleTree, loading, failed } = props.state
const nodes = computed(() => {
  const convert = (rows: typeof visibleTree.value): NonNullable<TreeProps['treeData']> =>
    rows.map((row) => ({
      key: row.id,
      title: [row.name, row.spaceTypeName].filter(Boolean).join(' · '),
      children: convert(row.children || [])
    }))
  return convert(visibleTree.value)
})
</script>
<template>
  <aside class="ledger-space">
    <div class="ledger-space-heading">
      <strong>{{ t('Setting.spaceTree') }}</strong>
    </div>
    <a-input
      v-model:value="keyword"
      allow-clear
      :placeholder="t('Archive.searchSpace')"
    />
    <a-spin :spinning="loading">
      <div class="ledger-space-tree">
        <a-tree
          v-if="nodes.length"
          :tree-data="nodes"
          :selected-keys="selectedId ? [selectedId] : []"
          default-expand-all
          block-node
          @select="
            (keys) => {
              if (keys.length) selectedId = String(keys[0])
            }
          "
        />
        <CloudEmpty
          v-else-if="!loading"
          :description="t(failed ? 'Archive.scopeFailed' : 'Archive.noSpaces')"
        />
      </div>
    </a-spin>
  </aside>
</template>
<style scoped>
.ledger-space {
  display: flex;
  flex-direction: column;
  width: 13.125rem;
  flex: 0 0 13.125rem;
  min-height: 0;
  padding: 0 0.75rem 1.125rem;
  background: var(--panel-background, #fff);
  border: 1px solid var(--line, #f0f0f0);
  border-radius: var(--ant-border-radius-lg, 0.5rem);
}
.ledger-space-heading {
  display: flex;
  align-items: center;
  flex: none;
  height: 4rem;
  margin: 0 -0.75rem 1.125rem;
  padding: 0 1rem;
  border-bottom: 1px solid var(--ant-color-border-secondary, #f0f0f0);
  font-size: var(--fs-14);
}
.ledger-space > .ant-input-affix-wrapper {
  flex: none;
  margin-bottom: 1rem;
}
.ledger-space :deep(.ant-spin-nested-loading) {
  flex: 1;
  min-height: 0;
  overflow: auto;
}
.ledger-space-tree {
  min-width: 0;
}
.ledger-space-tree :deep(.ant-tree-title) {
  overflow-wrap: anywhere;
}
@media (max-width: 900px) {
  .ledger-space {
    width: 100%;
    flex-basis: auto;
    flex-shrink: 0;
  }
  .ledger-space :deep(.ant-spin-nested-loading) {
    max-height: 12rem;
  }
}
</style>
