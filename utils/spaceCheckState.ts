interface SpaceCheckNode {
  key: string
  children: SpaceCheckNode[]
}

/** 严格勾选时单独计算目录半选，父级本身是收费空间时不被下级的选择状态反向选中。 */
export function spaceCheckState(nodes: SpaceCheckNode[], selected: string[], eligible: Set<string>) {
  const chosen = new Set(selected)
  const checked: string[] = [], halfChecked: string[] = []
  function visit(node: SpaceCheckNode): [number, number] {
    let total = eligible.has(node.key) ? 1 : 0
    let count = total && chosen.has(node.key) ? 1 : 0
    for (const child of node.children) {
      const [childTotal, childCount] = visit(child)
      total += childTotal
      count += childCount
    }
    if (eligible.has(node.key) ? chosen.has(node.key) : total > 0 && count === total) checked.push(node.key)
    else if (count > 0) halfChecked.push(node.key)
    return [total, count]
  }
  nodes.forEach(visit)
  return { checked, halfChecked }
}
