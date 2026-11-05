<script setup lang="ts">
import FinancePage from '../components/FinancePage.vue'
import { computed, ref } from 'vue'
import SubjectCategories from './SubjectCategories.vue'
import SubjectImportModal from './SubjectImportModal.vue'
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
  select,
  close,
  save,
  submitCategory,
  removeBatch,
  startIssue,
  issue
} = state
const permission = computed(() => (props.projectMode ? projectSubjectPermission : subjectPermission))
const excel = useSubjectExcel(reload)
const historyOpen = ref(false)
</script>
<template>
  <FinancePage>
    <ProjectScopeBar v-if="projectMode" />
    <div class="subject-workspace">
      <SubjectCategories
        :state="state"
        :project-mode="projectMode"
      />
      <main class="subject-content">
        <div class="subject-content-heading subject-catalog-heading">
          <a-space wrap>
            <j-permission-button
              v-if="!projectMode"
              :hasPermission="`${permission}:import`"
              @click="excel.openImport"
            >
              {{ t('Subject.import') }}
            </j-permission-button>
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
        <div
          v-if="!projectMode && selectedKeys.length"
          class="subject-local-actions"
        >
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
    <SubjectImportModal
      v-if="!projectMode"
      :state="excel"
      @history="historyOpen = true"
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
  </FinancePage>
</template>
<style src="../finance.css"></style>
<style scoped src="./subject.css"></style>
