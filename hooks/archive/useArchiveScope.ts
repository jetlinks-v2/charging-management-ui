import { computed, onMounted, onScopeDispose, ref, watch } from 'vue'
import { getSpaceTree, spaceSyncStatus, syncSpaces, type Space, type SpaceSyncStatus } from '../../api/archive'
import { useProjectContext } from '../project/useProjectContext'
export const flattenSpaces = (nodes: Space[]): Space[] =>
  nodes.flatMap((node) => [node, ...flattenSpaces(node.children || [])])
export const filterSpaces = (nodes: Space[], keyword: string): Space[] =>
  nodes.flatMap((node) => {
    const children = filterSpaces(node.children || [], keyword)
    return node.name.toLowerCase().includes(keyword.trim().toLowerCase()) || children.length
      ? [{ ...node, children }]
      : []
  })
/** 来源 leaf 是完整来源树的事实；可见子树无 children 不代表能维护房屋。 */
export function useArchiveScope() {
  const context = useProjectContext()
  const { projects, projectId } = context
  const tree = ref<Space[]>([])
  const selectedId = ref<string>()
  const keyword = ref('')
  const loading = ref(false)
  const failed = ref(false)
  const syncing = ref(false)
  const status = ref<SpaceSyncStatus>()
  const statusFailed = ref(false)
  let generation = 0
  let disposed = false
  const selected = computed(() => flattenSpaces(tree.value).find((node) => node.id === selectedId.value))
  const scope = computed(() => ({ projectId: projectId.value, spaceId: selectedId.value }))
  const visibleTree = computed(() => filterSpaces(tree.value, keyword.value))
  async function loadProjects() {
    try {
      await context.refresh()
      if (!disposed) failed.value = false
    } catch {
      if (!disposed) failed.value = true
    }
  }
  async function loadTree() {
    const token = ++generation
    tree.value = []
    selectedId.value = undefined
    loading.value = false
    if (!projectId.value) return
    loading.value = true
    failed.value = false
    try {
      const result = await getSpaceTree(projectId.value)
      if (!disposed && token === generation) tree.value = result
    } catch {
      if (!disposed && token === generation) failed.value = true
    } finally {
      if (!disposed && token === generation) loading.value = false
    }
  }
  async function refreshStatus() {
    try {
      const result = await spaceSyncStatus()
      if (!disposed) {
        status.value = result
        statusFailed.value = false
      }
    } catch {
      if (!disposed) statusFailed.value = true
    }
  }
  async function synchronize() {
    if (syncing.value || status.value?.running) return
    syncing.value = true
    try {
      await syncSpaces()
      await loadTree()
    } finally {
      syncing.value = false
      await refreshStatus()
    }
  }
  watch(
    projectId,
    () => {
      void loadTree()
    },
    { flush: 'sync' }
  )
  onMounted(() => {
    const previous = projectId.value
    void loadProjects().then(() => {
      if (!disposed && previous === projectId.value) void loadTree()
    })
    void refreshStatus()
  })
  onScopeDispose(() => {
    disposed = true
    generation++
  })
  return {
    projects,
    projectId,
    tree,
    selectedId,
    keyword,
    visibleTree,
    selected,
    scope,
    loading,
    failed,
    syncing,
    status,
    statusFailed,
    loadProjects,
    loadTree,
    refreshStatus,
    synchronize
  }
}
