<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  useSubjectCatalog,
  subjectPermission,
  projectSubjectPermission
} from '../../../hooks/finance-subject/useSubjectCatalog'
import SubjectDrawer from './SubjectDrawer.vue'
import SubjectTable from './SubjectTable.vue'
import SubjectImportHistory from './SubjectImportHistory.vue'
import ProjectScopeBar from '../components/ProjectScopeBar.vue'
import { useSubjectExcel } from '../../../hooks/finance-subject/useSubjectExcel'
const props = defineProps<{ projectMode?: boolean }>()
const { t } = useI18n()
const state = useSubjectCatalog(props.projectMode)
const {
  categories,
  tree,
  feeTypes,
  arrearsOptions,
  selectedCategory,
  open,
  detail,
  loading,
  failed,
  saving,
  readOnly,
  categoryOpen,
  categoryModel,
  issueOpen,
  issueIds,
  issueProjects,
  selectedKeys,
  metadataFailed,
  projects,
  reload,
  metadata,
  select,
  close,
  save,
  editCategory,
  submitCategory,
  removeCategory,
  removeBatch,
  startIssue,
  issue
} = state
const permission = computed(() => (props.projectMode ? projectSubjectPermission : subjectPermission))
const { busy: excelBusy, template, upload } = useSubjectExcel(reload)
const selected = computed(() => categories.value.find((item) => item.id === selectedCategory.value))
const refresh = () => {
  void metadata()
  reload()
}
const historyOpen = ref(false)
</script>
<template>
  <j-page-container>
    <ProjectScopeBar v-if="projectMode" />
    <div class="subject-workspace">
      <aside class="subject-categories">
        <div class="subject-tree-heading">
          <strong>{{ t('Subject.categories') }}</strong>
          <j-permission-button
            v-if="!projectMode"
            :hasPermission="`${subjectPermission}:category-save`"
            type="text"
            @click="editCategory()"
          >
            <AIcon type="PlusOutlined" />
          </j-permission-button>
        </div>
        <a-button
          block
          :type="!selectedCategory ? 'primary' : 'text'"
          :ghost="!selectedCategory"
          @click="selectedCategory = ''"
        >
          {{ t('Subject.allCategories') }}
        </a-button>
        <a-tree
          v-if="tree.length"
          :tree-data="tree"
          :selected-keys="selectedCategory ? [selectedCategory] : []"
          default-expand-all
          block-node
          @select="
            (keys) => {
              selectedCategory = keys.length ? String(keys[0]) : ''
            }
          "
        />
        <CloudEmpty
          v-else
          :description="t('Subject.noCategories')"
        />
      </aside>
      <main class="subject-content">
        <div class="subject-content-heading">
          <div>
            <h2>{{ selected?.name || t(projectMode ? 'Subject.projectSubjects' : 'Subject.title') }}</h2>
            <span class="subject-caption">{{ t(projectMode ? 'Subject.projectHint' : 'Subject.catalogHint') }}</span>
          </div>
          <a-space wrap>
            <j-permission-button
              v-if="!projectMode"
              :hasPermission="`${permission}:imports`"
              @click="historyOpen = true"
            >
              {{ t('Subject.importHistory') }}
            </j-permission-button>
            <a-button @click="refresh">
              <AIcon type="ReloadOutlined" />
            </a-button>
            <j-permission-button
              v-if="!projectMode"
              :hasPermission="`${permission}:import`"
              :loading="excelBusy"
              @click="template"
            >
              {{ t('Subject.template') }}
            </j-permission-button>
            <a-upload
              v-if="!projectMode"
              accept=".xlsx,.xls"
              :show-upload-list="false"
              :before-upload="upload"
            >
              <j-permission-button
                :hasPermission="`${permission}:import`"
                :loading="excelBusy"
              >
                {{ t('Subject.import') }}
              </j-permission-button>
            </a-upload>
            <j-permission-button
              v-if="!projectMode"
              :hasPermission="`${permission}:save`"
              type="primary"
              :disabled="metadataFailed"
              @click="select(undefined, false)"
            >
              {{ t('Subject.create') }}
            </j-permission-button>
          </a-space>
        </div>
        <div class="subject-local-actions">
          <a-space v-if="selected && !projectMode">
            <j-permission-button
              :hasPermission="`${subjectPermission}:category-save`"
              size="small"
              @click="editCategory(selected, true)"
            >
              {{ t('Subject.addChild') }}
            </j-permission-button>
            <j-permission-button
              :hasPermission="`${subjectPermission}:category-save`"
              size="small"
              @click="editCategory(selected)"
            >
              {{ t('Subject.editCategory') }}
            </j-permission-button>
            <a-popconfirm
              :title="t('Finance.deleteConfirm', { name: selected.name })"
              @confirm="removeCategory(selected)"
            >
              <j-permission-button
                :hasPermission="`${subjectPermission}:category-delete`"
                type="text"
                danger
                size="small"
              >
                {{ t('Finance.delete') }}
              </j-permission-button>
            </a-popconfirm>
          </a-space>
          <j-permission-button
            v-if="!projectMode && selectedKeys.length"
            :hasPermission="`${subjectPermission}:issue`"
            @click="startIssue()"
          >
            {{ t('Subject.issueSelected', { count: selectedKeys.length }) }}
          </j-permission-button>
          <a-popconfirm
            v-if="!projectMode && selectedKeys.length"
            :title="t('Subject.batchDeleteConfirm', { count: selectedKeys.length })"
            @confirm="removeBatch"
          >
            <j-permission-button
              :hasPermission="`${subjectPermission}:delete`"
              danger
              :loading="saving"
            >
              {{ t('Subject.batchDelete') }}
            </j-permission-button>
          </a-popconfirm>
        </div>
        <SubjectTable
          :state="state"
          :project-mode="projectMode"
        />
      </main>
    </div>
    <SubjectDrawer
      :open="open"
      :detail="detail"
      :selected-category="selectedCategory"
      :categories="categories"
      :fee-types="feeTypes"
      :arrears-options="arrearsOptions"
      :state="{ loading, failed, saving, readOnly }"
      @close="close"
      @save="save"
    />
    <SubjectImportHistory
      v-if="!projectMode"
      :open="historyOpen"
      @close="historyOpen = false"
    />
    <a-modal
      :open="categoryOpen"
      :title="t(categoryModel.id ? 'Subject.editCategory' : 'Subject.addCategory')"
      :confirm-loading="saving"
      @cancel="categoryOpen = false"
      @ok="submitCategory"
    >
      <a-form layout="vertical">
        <a-form-item
          :label="t('Subject.categoryName')"
          required
        >
          <a-input
            v-model:value="categoryModel.name"
            :maxlength="100"
          />
        </a-form-item>
        <a-form-item :label="t('Subject.sortIndex')">
          <a-input-number
            v-model:value="categoryModel.sortIndex"
            :min="0"
            :precision="0"
          />
        </a-form-item>
      </a-form>
    </a-modal>
    <a-modal
      :open="issueOpen"
      :title="t('Subject.issue')"
      :confirm-loading="saving"
      :ok-button-props="{ disabled: !issueProjects.length }"
      @cancel="issueOpen = false"
      @ok="issue"
    >
      <p>{{ t('Subject.issueHint', { count: issueIds.length }) }}</p>
      <a-select
        v-model:value="issueProjects"
        mode="multiple"
        style="width: 100%"
        :placeholder="t('Subject.chooseProjects')"
        :options="projects.map((item) => ({ value: item.id, label: item.name }))"
      />
    </a-modal>
  </j-page-container>
</template>
<style src="../finance.css"></style>
<style scoped src="./subject.css"></style>
