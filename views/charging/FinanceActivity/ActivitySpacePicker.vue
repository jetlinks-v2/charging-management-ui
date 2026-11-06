<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { ActivitySpace } from '../../../api/financeActivity'
import { useActivitySpaces } from '../../../hooks/finance-activity/useActivitySpaces'
const props = defineProps<{ spaces: ActivitySpace[]; selectedIds: string[]; busy: boolean }>()
const emit = defineEmits<{ close: []; pick: [string[]] }>()
const { t } = useI18n()
const { keyword, selected, visibleTree, expandedKeys, expanded, check } = useActivitySpaces(props)
</script>
<template>
  <a-modal
    :open="true"
    :width="760"
    :title="t('Activity.chooseSpaces')"
    :mask-closable="false"
    :ok-button-props="{ disabled: busy || !selected.length || selected.length > 1000 }"
    :ok-text="t('Activity.confirmSpaces')"
    @ok="emit('pick', selected)"
    @cancel="emit('close')"
  >
    <div class="activity-space-picker">
      <a-input-search
        v-model:value="keyword"
        :placeholder="t('Archive.searchSpace')"
        :aria-label="t('Archive.searchSpace')"
        allow-clear
      />
      <div class="activity-space-toolbar">
        <span>{{ t('Activity.selectedSpaces', { count: selected.length }) }}</span>
        <a-button
          size="small"
          :disabled="busy || !selected.length"
          @click="selected = []"
        >
          {{ t('Setting.clearHouses') }}
        </a-button>
      </div>
      <a-tree
        v-if="visibleTree.length"
        :tree-data="visibleTree"
        :checked-keys="selected"
        :expanded-keys="expanded"
        :auto-expand-parent="!!keyword.trim()"
        :disabled="busy"
        checkable
        block-node
        :selectable="false"
        :height="360"
        @expand="(keys) => (expandedKeys = keys.map(String))"
        @check="check"
      >
        <template #title="node">
          <span class="activity-space-row">
            <AIcon :type="node.leaf ? 'HomeOutlined' : 'FolderOutlined'" />
            <span>{{ node.title }}</span>
            <a-tag v-if="node.spaceTypeName">{{ node.spaceTypeName }}</a-tag>
          </span>
        </template>
      </a-tree>
      <CloudEmpty
        v-else
        :description="t(keyword.trim() ? 'Setting.houseTreeNoMatch' : 'Archive.noSpaces')"
      />
    </div>
  </a-modal>
</template>
<style scoped>
.activity-space-picker {
  display: grid;
  gap: 16px;
}
.activity-space-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.activity-space-row {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 32px;
}
.activity-space-row > .anticon {
  color: var(--ant-color-primary, #1677ff);
}
.activity-space-row > span {
  overflow-wrap: anywhere;
}
.activity-space-picker :deep(.ant-tree-node-content-wrapper) {
  padding: 4px 8px;
}
.activity-space-picker :deep(.ant-tree-switcher),
.activity-space-picker :deep(.ant-tree-checkbox) {
  line-height: 40px;
}
</style>
