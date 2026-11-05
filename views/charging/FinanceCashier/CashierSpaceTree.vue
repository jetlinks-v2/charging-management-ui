<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { useCashierWorkspace } from '../../../hooks/finance-cashier/useCashierWorkspace'
const props = defineProps<{ state: ReturnType<typeof useCashierWorkspace>; busy: boolean }>()
const { t } = useI18n()
const { archive, tree, chooseHouse } = props.state
</script>
<template>
  <aside class="cashier-spaces">
    <strong class="cashier-section-title">{{ t('Setting.spaceTree') }}</strong>
    <a-input
      v-model:value="archive.keyword.value"
      :placeholder="t('Archive.searchSpace')"
      allow-clear
    />
    <a-spin :spinning="archive.loading.value">
      <a-tree
        v-if="tree.length"
        :tree-data="tree"
        block-node
        default-expand-all
        :disabled="busy"
        :selected-keys="archive.selectedId.value ? [archive.selectedId.value] : []"
        @select="(keys) => keys.length && chooseHouse(String(keys[0]))"
      />
      <CloudEmpty
        v-else-if="!archive.loading.value"
        :description="t(archive.failed.value ? 'Finance.failed' : 'Archive.noSpaces')"
      />
    </a-spin>
  </aside>
</template>
