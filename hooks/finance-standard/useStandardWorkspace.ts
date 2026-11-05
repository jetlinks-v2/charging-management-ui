import { computed, onMounted, onScopeDispose, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { onlyMessage, downloadFileByUrl } from '@jetlinks-web/utils'
import {
  getStandardOptions,
  queryStandards,
  getStandard,
  saveStandard,
  deleteStandard,
  exportStandards,
  type StandardOptions,
  type FinanceStandard,
  type StandardInput
} from '../../api/financeStandard'
import type { Query } from '../../api/archive'
import { categoryTree, categoryKeys, filterCategoryTree } from '../finance-subject/categoryTree'
import { useProjectContext, useProjectSwitchGuard } from '../project/useProjectContext'
import { requestErrorMessage } from '../../utils/requestError'
import { excelErrorMessage } from '../../utils/archiveFiles'
export const standardPermission = 'charging/FinanceStandard'
export const emptyOptions = (): StandardOptions => ({
  categories: [],
  subjects: [],
  variables: [],
  billingMethods: [],
  chargeRoundTypes: [],
  mantissas: [],
  settlementMethods: [],
  delayCalcForms: [],
  delayRoundTypes: [],
  delayBaseTypes: [],
  effectiveStatuses: []
})
export function useStandardWorkspace() {
  const { t } = useI18n(),
    context = useProjectContext()
  const options = ref<StandardOptions>(emptyOptions()),
    metadataFailed = ref(false),
    metadataLoading = ref(false)
  const selectedCategory = ref(''),
    selectedSubject = ref(''),
    effectiveStatus = ref(''),
    terms = ref<Query['terms']>([])
  const treeKeyword = ref(''),
    treeExpandedKeys = ref<string[]>([])
  const selectedSubjectInfo = computed(() => options.value.subjects.find((row) => row.id === selectedSubject.value))
  const canCreate = computed(
    () => !!context.projectId.value && !!selectedSubjectInfo.value && !metadataLoading.value && !metadataFailed.value
  )
  const table = ref<{ reload: () => void }>(),
    open = ref(false),
    loading = ref(false),
    failed = ref(false),
    saving = ref(false),
    readOnly = ref(true),
    exporting = ref(false),
    variablesOpen = ref(false)
  const detail = ref<FinanceStandard>()
  const selectedId = ref<string>()
  let metadataToken = 0,
    detailToken = 0,
    disposed = false
  const filters = computed(() => ({
    categoryId: selectedCategory.value,
    subjectId: selectedSubject.value,
    effectiveStatus: effectiveStatus.value
  }))
  const params = computed(() => ({
    projectId: context.projectId.value,
    ...filters.value,
    terms: terms.value,
    sorts: [{ name: 'createTime', order: 'desc' }]
  }))
  const tree = computed(() => {
    const roots = categoryTree(options.value.categories)
    const folders = new Map<string, (typeof roots)[number]>()
    function visit(nodes: typeof roots) {
      for (const node of nodes) {
        folders.set(node.key, node)
        node.key = 'category:' + node.key
        visit(node.children)
      }
    }
    visit(roots)
    for (const subject of options.value.subjects) {
      const node = { key: 'subject:' + subject.id, value: subject.id, title: subject.name, children: [] }
      const folder = folders.get(subject.categoryId)
      if (folder) folder.children.push(node)
      else roots.push(node)
    }
    return roots
  })
  const treeSelection = computed(() =>
    selectedSubject.value
      ? ['subject:' + selectedSubject.value]
      : selectedCategory.value
        ? ['category:' + selectedCategory.value]
        : []
  )
  const visibleTree = computed(() => filterCategoryTree(tree.value, treeKeyword.value))
  const visibleExpandedKeys = computed(() =>
    treeKeyword.value.trim() ? categoryKeys(visibleTree.value) : treeExpandedKeys.value
  )
  function selectTree(keys: unknown[]) {
    const value = String(keys[0] || '')
    selectedSubject.value = value.startsWith('subject:') ? value.slice(8) : ''
    selectedCategory.value = value.startsWith('category:') ? value.slice(9) : ''
  }
  const notify = (cause: unknown) => onlyMessage(requestErrorMessage(cause, t('Finance.failed')), 'error')
  const reload = () => table.value?.reload()
  async function metadata() {
    const project = context.projectId.value,
      token = ++metadataToken
    options.value = emptyOptions()
    metadataFailed.value = false
    if (!project) {
      metadataLoading.value = false
      return
    }
    metadataLoading.value = true
    try {
      const result = await getStandardOptions(project)
      if (!disposed && token === metadataToken) {
        options.value = result
        treeExpandedKeys.value = categoryKeys(tree.value)
      }
    } catch (cause) {
      if (token === metadataToken) {
        metadataFailed.value = true
        notify(cause)
      }
    } finally {
      if (token === metadataToken) metadataLoading.value = false
    }
  }
  async function select(key?: string, view = true) {
    if (!context.projectId.value) return
    // 新标准从左侧已下发科目进入，避免在表单中另选科目造成范围错位。
    if (!key && !canCreate.value) return
    const token = ++detailToken,
      project = context.projectId.value
    selectedId.value = key
    open.value = true
    readOnly.value = view
    loading.value = !!key
    failed.value = false
    detail.value = undefined
    if (!key) return
    try {
      const result = await getStandard(project, key)
      if (!disposed && token === detailToken) detail.value = result
    } catch (cause) {
      if (token === detailToken) {
        failed.value = true
        notify(cause)
      }
    } finally {
      if (token === detailToken) loading.value = false
    }
  }
  function close() {
    if (!saving.value) {
      ++detailToken
      open.value = false
    }
  }
  async function save(input: StandardInput) {
    if (
      readOnly.value ||
      loading.value ||
      failed.value ||
      metadataFailed.value ||
      saving.value ||
      !context.projectId.value
    )
      return
    saving.value = true
    try {
      await saveStandard(context.projectId.value, detail.value?.id, { ...input, version: detail.value?.version })
      open.value = false
      onlyMessage(t('Finance.saved', { name: input.standardName }), 'success')
      reload()
    } catch (cause) {
      notify(cause)
    } finally {
      saving.value = false
    }
  }
  async function remove(row: FinanceStandard) {
    if (saving.value) return
    saving.value = true
    try {
      await deleteStandard(context.projectId.value, row)
      onlyMessage(t('Finance.deleted', { name: row.standardName }), 'success')
      reload()
    } catch (cause) {
      notify(cause)
    } finally {
      saving.value = false
    }
  }
  async function request(query: Query, config?: { signal: AbortSignal }) {
    if (!context.projectId.value) return { success: true, result: { data: [], total: 0, pageIndex: 0, pageSize: 12 } }
    return queryStandards(context.projectId.value, query, filters.value, config?.signal)
  }
  async function exportFile() {
    if (exporting.value || !context.projectId.value) return
    exporting.value = true
    try {
      const file = await exportStandards(
        context.projectId.value,
        { terms: terms.value, sorts: [{ name: 'createTime', order: 'desc' }] },
        filters.value
      )
      const url = URL.createObjectURL(file)
      try {
        downloadFileByUrl(url, t('Standard.exportFile'), 'xlsx')
      } finally {
        setTimeout(() => URL.revokeObjectURL(url), 1000)
      }
    } catch (cause) {
      onlyMessage(await excelErrorMessage(cause, t('Finance.failed')), 'error')
    } finally {
      exporting.value = false
    }
  }
  useProjectSwitchGuard(() => !saving.value && !exporting.value && !open.value && !variablesOpen.value)
  watch(context.projectId, () => {
    ++detailToken
    open.value = false
    detail.value = undefined
    selectedCategory.value = ''
    selectedSubject.value = ''
    treeKeyword.value = ''
    void metadata()
  })
  onMounted(() => {
    void metadata()
    void context.refresh().catch(notify)
  })
  onScopeDispose(() => {
    disposed = true
    ++metadataToken
    ++detailToken
  })
  return {
    projectId: context.projectId,
    project: context.current,
    options,
    tree,
    treeKeyword,
    visibleTree,
    visibleExpandedKeys,
    treeExpandedKeys,
    selectedSubjectInfo,
    canCreate,
    metadataFailed,
    metadataLoading,
    selectedCategory,
    selectedSubject,
    treeSelection,
    selectTree,
    effectiveStatus,
    terms,
    table,
    params,
    filters,
    open,
    loading,
    failed,
    saving,
    readOnly,
    exporting,
    variablesOpen,
    detail,
    notify,
    reload,
    metadata,
    select,
    close,
    retry: () => select(selectedId.value, readOnly.value),
    save,
    remove,
    request,
    exportFile
  }
}
