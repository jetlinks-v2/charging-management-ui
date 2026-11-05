<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { subjectPermission, type useSubjectCatalog } from '../../../hooks/finance-subject/useSubjectCatalog'
const props = defineProps<{ state: ReturnType<typeof useSubjectCatalog>; projectMode?: boolean }>()
const { t } = useI18n()
const {
  categoryKeyword,
  visibleTree,
  visibleExpandedKeys,
  categoryExpandedKeys,
  selectedCategory,
  editCategory,
  editCategoryNode,
  removeCategoryNode,
  saving
} = props.state
</script>
<template>
  <aside class="subject-categories">
    <div class="subject-tree-heading">
      <strong>{{ t('Subject.categories') }}</strong>
      <j-permission-button
        v-if="!projectMode"
        :hasPermission="`${subjectPermission}:category-save`"
        type="text"
        :title="t('Subject.addCategory')"
        :aria-label="t('Subject.addCategory')"
        @click="editCategory()"
      >
        <AIcon type="PlusOutlined" />
      </j-permission-button>
    </div>
    <a-input
      v-model:value="categoryKeyword"
      class="subject-tree-search"
      allow-clear
      :placeholder="t('Subject.searchCategories')"
      :aria-label="t('Subject.searchCategories')"
    >
      <template #prefix><AIcon type="SearchOutlined" /></template>
    </a-input>
    <a-tree
      v-if="visibleTree.length"
      :tree-data="visibleTree"
      :selected-keys="selectedCategory ? [selectedCategory] : []"
      :expanded-keys="visibleExpandedKeys"
      block-node
      @expand="(keys) => (categoryExpandedKeys = keys.map(String))"
      @select="(keys) => (selectedCategory = keys.length ? String(keys[0]) : '')"
    >
      <template #title="{ key, title }">
        <span class="subject-tree-node">
          <span
            class="subject-tree-name"
            :title="title"
          >
            {{ title }}
          </span>
          <span
            v-if="!projectMode"
            class="subject-tree-actions"
            @click.stop
          >
            <j-permission-button
              :hasPermission="`${subjectPermission}:category-save`"
              type="text"
              size="small"
              :title="t('Subject.addChild')"
              :aria-label="t('Subject.addChild')"
              :disabled="saving"
              @click="editCategoryNode(String(key), true)"
            >
              <AIcon type="PlusOutlined" />
            </j-permission-button>
            <j-permission-button
              :hasPermission="`${subjectPermission}:category-save`"
              type="text"
              size="small"
              :title="t('Subject.editCategory')"
              :aria-label="t('Subject.editCategory')"
              :disabled="saving"
              @click="editCategoryNode(String(key))"
            >
              <AIcon type="EditOutlined" />
            </j-permission-button>
            <a-popconfirm
              :title="t('Finance.deleteConfirm', { name: title })"
              @confirm="removeCategoryNode(String(key))"
            >
              <j-permission-button
                :hasPermission="`${subjectPermission}:category-delete`"
                type="text"
                size="small"
                danger
                :title="t('Finance.delete')"
                :aria-label="t('Finance.delete')"
                :disabled="saving"
              >
                <AIcon type="DeleteOutlined" />
              </j-permission-button>
            </a-popconfirm>
          </span>
        </span>
      </template>
    </a-tree>
    <CloudEmpty
      v-else
      :description="t(categoryKeyword.trim() ? 'Subject.noCategoryMatch' : 'Subject.noCategories')"
    />
  </aside>
</template>
<style scoped src="./subject-tree.css"></style>
