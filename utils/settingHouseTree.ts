import type { FinanceSpace } from '../api/financeSpace'
import type { HouseInfo } from '../api/financeSetting'

export interface SettingHouseNode {
  key: string
  title: string
  fullName: string
  typeName?: string
  billingArea?: string | number
  leaf: boolean
  available: boolean
  added: boolean
  disabled: boolean
  children: SettingHouseNode[]
}

export function settingHouseNodes(
  spaces: FinanceSpace[],
  houses: Map<string, HouseInfo>,
  added: Set<string>,
  path = ''
): SettingHouseNode[] {
  return spaces.map((space) => {
    const children = settingHouseNodes(space.children || [], houses, added, path + space.name + '/')
    const leaf = space.leaf && children.length === 0
    const house = leaf ? houses.get(space.id) : undefined
    return {
      key: space.id,
      title: space.name,
      fullName: house?.fullName || path + space.name,
      typeName: space.spaceTypeName,
      billingArea: house?.billingArea,
      leaf,
      available: !!house,
      added: added.has(space.id),
      disabled: leaf ? !house || added.has(space.id) : !children.some((child) => !child.disabled),
      children
    }
  })
}

export const flattenHouseNodes = (nodes: SettingHouseNode[]): SettingHouseNode[] =>
  nodes.flatMap((node) => [node, ...flattenHouseNodes(node.children)])

/** 搜索父节点保留整个下级范围，搜索房屋保留其上级；勾选范围只包含当前可见的可用末端。 */
export function filterHouseNodes(nodes: SettingHouseNode[], keyword: string): SettingHouseNode[] {
  const term = keyword.trim().toLowerCase()
  if (!term) return nodes
  return nodes.flatMap((node) => {
    if (node.fullName.toLowerCase().includes(term) || node.typeName?.toLowerCase().includes(term)) return [node]
    const children = filterHouseNodes(node.children, term)
    return children.length ? [{ ...node, children }] : []
  })
}
