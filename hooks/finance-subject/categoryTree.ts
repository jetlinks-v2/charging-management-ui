import type { Category } from '../../api/financeSubject'
export interface CategoryNode {
  key: string
  value: string
  title: string
  children: CategoryNode[]
}
/** 后端父级不可普通移动；保留完整路径供同名目录选择与详情解析。 */
export function categoryTree(rows: Category[]): CategoryNode[] {
  const nodes = new Map(
    rows.map((row) => [
      row.id,
      { key: row.id, value: row.id, title: row.name, children: [] as CategoryNode[] }
    ])
  )
  const roots: CategoryNode[] = []
  for (const row of rows) {
    const node = nodes.get(row.id)!
    const parent = nodes.get(row.parentId)
    if (parent && parent !== node) parent.children.push(node)
    else roots.push(node)
  }
  return roots
}
export function categoryPath(rows: Category[], id: string) {
  const map = new Map(rows.map((row) => [row.id, row]))
  const parts: string[] = []
  const seen = new Set<string>()
  let row = map.get(id)
  while (row && !seen.has(row.id)) {
    seen.add(row.id)
    parts.unshift(row.name)
    row = map.get(row.parentId)
  }
  return parts.join(' / ')
}

/** 搜索保留匹配节点的完整父路径，匹配目录本身时保留其全部后代。 */
export function filterCategoryTree(nodes: CategoryNode[], keyword: string): CategoryNode[] {
  const value = keyword.trim().toLocaleLowerCase()
  if (!value) return nodes
  return nodes.flatMap((node) => {
    if (node.title.toLocaleLowerCase().includes(value)) return [node]
    const children = filterCategoryTree(node.children, value)
    return children.length ? [{ ...node, children }] : []
  })
}

export function categoryKeys(nodes: CategoryNode[]): string[] {
  return nodes.flatMap((node) => [node.key, ...categoryKeys(node.children)])
}
