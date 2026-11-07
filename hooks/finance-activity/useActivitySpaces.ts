import { computed, ref } from 'vue'
import type { ActivitySpace } from '../../api/financeActivity'
import { spaceCheckState } from '../../utils/spaceCheckState'
import {
  activitySpaceTree,
  filterActivitySpaces,
  flattenActivitySpaces,
  activitySelectedLeaves
} from '../../utils/activitySpaces'

export function useActivitySpaces(props: { spaces: ActivitySpace[]; selectedIds: string[] }) {
  const keyword = ref('')
  const tree = computed(() => activitySpaceTree(props.spaces))
  // 弹窗仅编辑副本，保存实际客户空间；祖先只是展示路径，不按末级推断。
  const selected = ref(activitySelectedLeaves(tree.value, props.selectedIds))
  const visibleTree = computed(() => filterActivitySpaces(tree.value, keyword.value))
  const checkedKeys = computed(() => spaceCheckState(visibleTree.value, selected.value,
    new Set(flattenActivitySpaces(visibleTree.value).filter((node) => node.customerBound).map((node) => node.id))))
  const expandedKeys = ref(
    props.spaces.filter((node) => !node.parentId || node.parentId === node.rootId).map((node) => node.id)
  )
  const expanded = computed(() => (keyword.value.trim() ? props.spaces.map((node) => node.id) : expandedKeys.value))
  function uncheck(ids: string[]) {
    const removed = new Set(ids)
    const parents = new Map(props.spaces.map((node) => [node.id, node.parentId]))
    for (const id of ids) {
      let parent = parents.get(id)
      while (parent && !removed.has(parent)) {
        removed.add(parent)
        parent = parents.get(parent)
      }
    }
    selected.value = selected.value.filter((id) => !removed.has(id))
  }
  function check(keys: (string | number)[] | { checked: (string | number)[] },
    info?: { node: { key: string | number }; checked: boolean }) {
    if (info) {
      const node = flattenActivitySpaces(visibleTree.value).find((row) => row.id === String(info.node.key))
      if (!node) return
      // 客户上级本身也是范围，选中后必须包含完整下级，与后端优惠范围判定一致。
      const scope = node.customerBound
        ? flattenActivitySpaces(tree.value).find((row) => row.id === node.id)!
        : node
      const ids = flattenActivitySpaces([scope]).filter((row) => row.customerBound).map((row) => row.id)
      if (info.checked) selected.value = [...new Set([...selected.value, ...ids])]
      else uncheck(ids)
      return
    }
    const visibleLeaves = new Set(
      flattenActivitySpaces(visibleTree.value)
        .filter((node) => node.customerBound)
        .map((node) => node.id)
    )
    const checked = (Array.isArray(keys) ? keys : keys.checked).map(String)
    // 与收费设置批量选房一致，搜索只变更可见房间，保留此前选中的隐藏房间。
    selected.value = [
      ...new Set([
        ...selected.value.filter((id) => !visibleLeaves.has(id)),
        ...checked.filter((id) => visibleLeaves.has(id))
      ])
    ]
  }
  return { keyword, selected, checkedKeys, visibleTree, expandedKeys, expanded, check }
}
