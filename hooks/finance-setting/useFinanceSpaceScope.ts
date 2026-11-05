import { computed, onScopeDispose, ref, watch } from 'vue'
import { getFinanceSpaceTree, type FinanceSpace } from '../../api/financeSpace'
import { useProjectContext } from '../project/useProjectContext'

export const flattenSpaces = (nodes: FinanceSpace[]): FinanceSpace[] =>
  nodes.flatMap((node) => [node, ...flattenSpaces(node.children || [])])

const filterSpaces = (nodes: FinanceSpace[], keyword: string): FinanceSpace[] =>
  nodes.flatMap((node) => {
    const children = filterSpaces(node.children || [], keyword)
    return node.name.toLowerCase().includes(keyword) || children.length ? [{ ...node, children }] : []
  })

/** 跟随收费全局项目；切换项目和销毁时丢弃旧请求，避免显示其他项目的空间。 */
export function useFinanceSpaceScope() {
  const { projects, projectId } = useProjectContext()
  const tree = ref<FinanceSpace[]>([])
  const selectedId = ref<string>()
  const keyword = ref('')
  const loading = ref(false)
  const failed = ref(false)
  let generation = 0
  let disposed = false
  const selected = computed(() => flattenSpaces(tree.value).find((node) => node.id === selectedId.value))
  const visibleTree = computed(() => filterSpaces(tree.value, keyword.value.trim().toLowerCase()))

  async function loadTree() {
    const token = ++generation
    const project = projectId.value
    tree.value = []
    selectedId.value = undefined
    failed.value = false
    loading.value = !!project
    if (!project) return
    try {
      const result = await getFinanceSpaceTree(project)
      if (!disposed && token === generation) tree.value = result
    } catch {
      if (!disposed && token === generation) failed.value = true
    } finally {
      if (!disposed && token === generation) loading.value = false
    }
  }
  watch(projectId, () => void loadTree(), { immediate: true, flush: 'sync' })
  onScopeDispose(() => {
    disposed = true
    ++generation
  })
  return { projects, projectId, tree, selectedId, keyword, visibleTree, selected, loading, failed, loadTree }
}
