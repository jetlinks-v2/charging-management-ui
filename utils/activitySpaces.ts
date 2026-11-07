import type { ActivitySpace } from '../api/financeActivity'

export interface ActivitySpaceNode extends ActivitySpace {
  key: string
  title: string
  children: ActivitySpaceNode[]
}

/** 使用来源的父子身份构树，不假定楼栋/楼层深度，父节点本身可选。 */
export function activitySpaceTree(spaces: ActivitySpace[]): ActivitySpaceNode[] {
  const nodes = new Map(
    spaces.map((space) => [space.id, { ...space, key: space.id, title: space.name, children: [] } as ActivitySpaceNode])
  )
  const roots: ActivitySpaceNode[] = []
  for (const node of nodes.values()) {
    const parent = node.parentId ? nodes.get(node.parentId) : undefined
    if (parent && parent !== node) parent.children.push(node)
    else roots.push(node)
  }
  return roots
}

/** 匹配子节点时保留祖先，匹配父节点时保留其完整下级。 */
export function filterActivitySpaces(nodes: ActivitySpaceNode[], keyword: string): ActivitySpaceNode[] {
  const term = keyword.trim().toLocaleLowerCase()
  if (!term) return nodes
  return nodes.flatMap((node) => {
    if (node.fullName.toLocaleLowerCase().includes(term) || node.spaceTypeName?.toLocaleLowerCase().includes(term))
      return [node]
    const children = filterActivitySpaces(node.children, term)
    return children.length ? [{ ...node, children }] : []
  })
}

export const flattenActivitySpaces = (nodes: ActivitySpaceNode[]): ActivitySpaceNode[] =>
  nodes.flatMap((node) => [node, ...flattenActivitySpaces(node.children)])

/** 已保存的上级范围展开为实际客户空间，来源节点不必是末级。 */
export function activitySelectedLeaves(nodes: ActivitySpaceNode[], ids: string[]): string[] {
  const selected = new Set(ids)
  const leaves: string[] = []
  function collect(branch: ActivitySpaceNode[], inherited = false) {
    for (const node of branch) {
      const checked = inherited || selected.has(node.id)
      if (node.customerBound && checked) leaves.push(node.id)
      collect(node.children, checked)
    }
  }
  collect(nodes)
  return leaves
}
