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
    rows.map((row) => ({ key: row.id, title: row.name, children: convert(row.children || []) }))
  return convert(visibleTree.value)
})
</script>
<template>
  <aside class="ledger-space">
    <div class="ledger-space-heading">
      <strong>{{ t('Setting.spaceTree') }}</strong>
      <a-button
        type="link"
        size="small"
        @click="selectedId = undefined"
      >
        {{ t('Funds.all') }}
      </a-button>
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
  width: 248px;
  flex: 0 0 248px;
  padding: 16px;
  background: var(--panel-background, #fff);
  border: 1px solid var(--line, #f0f0f0);
  border-radius: 8px;
}
.ledger-space-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
.ledger-space-tree {
  min-height: 160px;
  max-height: calc(100dvh - 300px);
  overflow: auto;
  margin-top: 12px;
}
@media (max-width: 900px) {
  .ledger-space {
    width: 100%;
    flex-basis: auto;
  }
  .ledger-space-tree {
    max-height: 220px;
  }
}
</style>
