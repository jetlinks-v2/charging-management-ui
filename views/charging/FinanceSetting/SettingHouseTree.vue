<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { FinanceSpace } from '../../../api/financeSpace'
import { useSettingHouseTree } from '../../../hooks/finance-setting/useSettingHouseTree'
const props = defineProps<{
  projectId: string
  spaces: FinanceSpace[]
  busy: boolean
  selectedIds: string[]
  limit: number
}>()
const emit = defineEmits<{ close: []; pick: [string[]] }>()
const { t } = useI18n()
const {
  keyword,
  loading,
  failed,
  selected,
  visibleTree,
  visibleHouses,
  remaining,
  expandedKeys,
  check,
  selectAll,
  clear,
  load
} = useSettingHouseTree(props)
</script>
<template>
  <a-modal
    :open="true"
    :width="720"
    :title="t('Setting.chooseHouse')"
    :confirm-loading="busy"
    :ok-text="t('Setting.addSelectedHouses', { count: selected.length })"
    :ok-button-props="{ disabled: loading || failed || !selected.length }"
    @ok="emit('pick', selected)"
    @cancel="emit('close')"
  >
    <div class="house-tree-picker">
      <a-input-search
        v-model:value="keyword"
        :placeholder="t('Archive.searchSpace')"
        :aria-label="t('Archive.searchSpace')"
        allow-clear
      />
      <div class="house-tree-toolbar">
        <span>{{ t('Setting.houseTreeCount', { count: selected.length, limit: remaining }) }}</span>
        <a-space :size="8">
          <a-button
            size="small"
            :disabled="loading || failed || busy || !visibleHouses.length"
            @click="selectAll"
          >
            {{ t(keyword.trim() ? 'Setting.checkMatches' : 'Setting.checkAllHouses') }}
          </a-button>
          <a-button
            size="small"
            :disabled="loading || busy || !selected.length"
            @click="clear"
          >
            {{ t('Setting.clearHouses') }}
          </a-button>
        </a-space>
      </div>
      <a-spin :spinning="loading || busy">
        <div class="house-tree-body">
          <template v-if="failed">
            <CloudEmpty :description="t('Finance.failed')" />
            <a-button @click="load">{{ t('Setting.retryTask') }}</a-button>
          </template>
          <a-tree
            v-else-if="visibleTree.length"
            v-model:expanded-keys="expandedKeys"
            :tree-data="visibleTree"
            :checked-keys="selected"
            :disabled="loading || busy"
            checkable
            block-node
            :selectable="false"
            :height="360"
            @check="check"
          >
            <template #title="node">
              <span class="house-tree-row">
                <AIcon
                  :type="node.leaf ? 'HomeOutlined' : 'FolderOutlined'"
                  class="house-tree-icon"
                />
                <span class="house-tree-name">{{ node.title }}</span>
                <span
                  v-if="node.typeName"
                  class="house-tree-meta"
                >
                  {{ node.typeName }}
                </span>
                <span
                  v-if="node.added"
                  class="house-tree-meta"
                >
                  {{ t('Setting.houseAlreadyAdded') }}
                </span>
                <span
                  v-else-if="node.leaf && !node.available && !loading"
                  class="house-tree-meta"
                >
                  {{ t('Setting.houseIncomplete') }}
                </span>
                <span
                  v-else-if="node.available"
                  class="house-tree-area"
                >
                  {{ node.billingArea }} m²
                </span>
              </span>
            </template>
          </a-tree>
          <CloudEmpty
            v-else-if="!loading"
            :description="t(keyword.trim() ? 'Setting.houseTreeNoMatch' : 'Archive.noSpaces')"
          />
        </div>
      </a-spin>
    </div>
  </a-modal>
</template>
<style scoped>
.house-tree-picker {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.house-tree-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  color: var(--ant-color-text-secondary, #595959);
}
.house-tree-body {
  min-height: 160px;
}
.house-tree-body :deep(.ant-tree-node-content-wrapper) {
  min-width: 0;
  padding: 4px 8px;
}
.house-tree-body :deep(.ant-tree-switcher),
.house-tree-body :deep(.ant-tree-checkbox) {
  line-height: 32px;
}
.house-tree-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  min-height: 24px;
}
.house-tree-name {
  overflow-wrap: anywhere;
}
.house-tree-icon {
  color: var(--ant-color-primary, #1677ff);
}
.house-tree-meta {
  color: var(--ant-color-text-tertiary, #8c8c8c);
  font-size: 12px;
}
.house-tree-area {
  margin-left: auto;
  color: var(--ant-color-text-secondary, #595959);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
</style>
