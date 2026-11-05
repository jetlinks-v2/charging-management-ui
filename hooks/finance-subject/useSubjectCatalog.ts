import { computed, onMounted, onScopeDispose, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { onlyMessage } from '@jetlinks-web/utils'
import type { Query } from '../../api/archive'
import {
  getCategories,
  getFeeTypes,
  getArrearsOptions,
  getSubject,
  saveSubject,
  deleteSubject,
  deleteSubjects,
  saveCategory,
  deleteCategory,
  querySubjects,
  queryProjectSubjects,
  deleteProjectSubject,
  getProjectSubject,
  issueSubjects,
  type Category,
  type Subject,
  type SubjectInput,
  type DictionaryOption,
  type ArrearsConfig,
  type ProjectSubject
} from '../../api/financeSubject'
import { useProjectContext, useProjectSwitchGuard } from '../project/useProjectContext'
import { requestErrorMessage } from '../../utils/requestError'
import { categoryTree, filterCategoryTree, categoryKeys } from './categoryTree'
export const subjectPermission = 'charging/FinanceSubject'
export const projectSubjectPermission = 'charging/FinanceProjectSubject'
export function useSubjectCatalog(projectMode = false) {
  const { t } = useI18n()
  const context = useProjectContext()
  const categories = ref<Category[]>([])
  const feeTypes = ref<DictionaryOption[]>([])
  const arrearsOptions = ref<ArrearsConfig[]>([])
  const selectedCategory = ref('')
  const terms = ref<Query['terms']>([])
  const table = ref<{ reload: () => void }>()
  const open = ref(false),
    loading = ref(false),
    failed = ref(false),
    saving = ref(false),
    readOnly = ref(true)
  const detail = ref<Subject>()
  const categoryOpen = ref(false),
    categoryModel = ref<Partial<Category> & { name: string; parentId: string }>({
      name: '',
      parentId: '',
      sortIndex: 1
    })
  const issueOpen = ref(false),
    issueIds = ref<string[]>([]),
    issueProjects = ref<string[]>([])
  const selectedKeys = ref<string[]>([])
  const selectedRows = ref<Subject[]>([])
  const metadataFailed = ref(false)
  let generation = 0,
    disposed = false
  const tree = computed(() => categoryTree(categories.value))
  const categoryKeyword = ref('')
  const visibleTree = computed(() => filterCategoryTree(tree.value, categoryKeyword.value))
  const categoryExpandedKeys = ref<string[]>([])
  const visibleExpandedKeys = computed(() =>
    categoryKeyword.value.trim() ? categoryKeys(visibleTree.value) : categoryExpandedKeys.value
  )
  watch(tree, (value) => {
    categoryExpandedKeys.value = categoryKeys(value)
  })
  const params = computed(() => ({
    terms: terms.value,
    categoryId: selectedCategory.value,
    projectId: projectMode ? context.projectId.value : '',
    sorts: [{ name: 'createTime', order: 'desc' }]
  }))
  const notify = (cause: unknown) => onlyMessage(requestErrorMessage(cause, t('Finance.failed')), 'error')
  const reload = () => table.value?.reload()
  async function metadata() {
    try {
      const result = await Promise.all([getCategories(), getFeeTypes(), getArrearsOptions()])
      if (!disposed) [categories.value, feeTypes.value, arrearsOptions.value] = result
      metadataFailed.value = false
    } catch (cause) {
      metadataFailed.value = true
      notify(cause)
    }
  }
  async function select(id?: string, view = true) {
    const token = ++generation
    open.value = true
    readOnly.value = view
    loading.value = !!id
    failed.value = false
    detail.value = undefined
    if (!id) return
    try {
      const value = projectMode
        ? (await getProjectSubject(context.projectId.value, id)).subject
        : await getSubject(id)
      if (!disposed && token === generation) detail.value = value
    } catch (cause) {
      if (token === generation) {
        failed.value = true
        notify(cause)
      }
    } finally {
      if (token === generation) loading.value = false
    }
  }
  function close() {
    if (!saving.value) {
      generation++
      open.value = false
    }
  }
  async function run(operation: () => Promise<unknown>, message: string) {
    if (saving.value) return
    saving.value = true
    try {
      await operation()
      onlyMessage(message, 'success')
      reload()
      return true
    } catch (cause) {
      notify(cause)
      return false
    } finally {
      saving.value = false
    }
  }
  async function save(input: SubjectInput) {
    if (readOnly.value || projectMode || metadataFailed.value || loading.value || failed.value) return
    if (await run(() => saveSubject(detail.value?.id, input), t('Finance.saved', { name: input.name })))
      open.value = false
  }
  async function remove(row: Subject | ProjectSubject) {
    const subject = 'subject' in row ? row.subject : row
    await run(
      () => ('subject' in row ? deleteProjectSubject(context.projectId.value, row) : deleteSubject(row)),
      t('Finance.deleted', { name: subject.name })
    )
  }
  async function removeBatch() {
    if (projectMode || !selectedRows.value.length || saving.value) return
    const rows = [...selectedRows.value]
    if (await run(() => deleteSubjects(rows), t('Subject.batchDeleted', { count: rows.length }))) {
      selectedKeys.value = []
      selectedRows.value = []
    }
  }
  function editCategory(row?: Category, child = false) {
    categoryModel.value = row && !child ? { ...row } : { name: '', parentId: row?.id || '', sortIndex: 1 }
    categoryOpen.value = true
  }
  function editCategoryNode(id: string, child = false) {
    const row = categories.value.find((item) => item.id === id)
    if (row) editCategory(row, child)
  }
  async function removeCategoryNode(id: string) {
    const row = categories.value.find((item) => item.id === id)
    if (row) await removeCategory(row)
  }
  async function submitCategory() {
    if (!categoryModel.value.name.trim()) {
      onlyMessage(t('Subject.required'), 'warning')
      return
    }
    if (
      await run(
        () => saveCategory(categoryModel.value),
        t('Finance.saved', { name: categoryModel.value.name })
      )
    ) {
      categoryOpen.value = false
      await metadata()
    }
  }
  async function removeCategory(row: Category) {
    if (await run(() => deleteCategory(row), t('Finance.deleted', { name: row.name }))) {
      if (selectedCategory.value === row.id) selectedCategory.value = ''
      await metadata()
    }
  }
  function startIssue(ids = selectedKeys.value) {
    issueIds.value = [...ids]
    issueProjects.value = []
    issueOpen.value = true
  }
  async function issue() {
    if (!issueIds.value.length || !issueProjects.value.length) {
      onlyMessage(t('Subject.issueRequired'), 'warning')
      return
    }
    if (
      await run(async () => {
        const result = await issueSubjects(issueIds.value, issueProjects.value)
        onlyMessage(t('Subject.issueResult', result), 'success')
      }, t('Subject.issued'))
    ) {
      issueOpen.value = false
      selectedKeys.value = []
      selectedRows.value = []
    }
  }
  async function request(query: Query, options?: { signal: AbortSignal }) {
    if (projectMode) {
      if (!context.projectId.value)
        return { success: true, result: { data: [], total: 0, pageIndex: 0, pageSize: 12 } }
      return queryProjectSubjects(context.projectId.value, query, selectedCategory.value, options?.signal)
    }
    return querySubjects(query, selectedCategory.value, options?.signal)
  }
  useProjectSwitchGuard(() => !saving.value && !open.value && !categoryOpen.value && !issueOpen.value)
  watch(context.projectId, () => {
    if (projectMode) {
      generation++
      open.value = false
      selectedKeys.value = []
      reload()
    }
  })
  watch([selectedCategory, terms], () => {
    selectedKeys.value = []
    selectedRows.value = []
  })
  onMounted(() => {
    void metadata()
    void context.refresh().catch(notify)
  })
  onScopeDispose(() => {
    disposed = true
    generation++
  })
  return {
    categories,
    tree,
    categoryKeyword,
    visibleTree,
    categoryExpandedKeys,
    visibleExpandedKeys,
    feeTypes,
    arrearsOptions,
    selectedCategory,
    terms,
    table,
    params,
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
    selectedRows,
    metadataFailed,
    projectId: context.projectId,
    projects: context.projects,
    reload,
    metadata,
    select,
    close,
    save,
    remove,
    removeBatch,
    editCategory,
    editCategoryNode,
    removeCategoryNode,
    submitCategory,
    removeCategory,
    startIssue,
    issue,
    notify,
    request
  }
}
