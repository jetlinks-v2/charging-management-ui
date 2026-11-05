import { checked } from './archive'
import { moduleRegistry } from '@jetlinks-web-core/utils/module-registry'

/** 收费模块消费的公开项目选项；项目权限由提供方及业务后端校验。 */
export interface ProjectOption {
  id: string
  name: string
  organizationPath?: readonly { id: string; name: string; isProject?: boolean }[]
}

/** 未接入与查询成功但无可选项目分开表达，避免把缺少接口误报为无数据。 */
export type ProjectOptionsResult = { status: 'notConfigured' } | { status: 'ready'; options: ProjectOption[] }

/** 通过基础模块公开资源取项目，不深引用它的页面或私有实现。 */
export const getProjectOptions = async (): Promise<ProjectOptionsResult> => {
  const load = moduleRegistry.getResourceItem<() => Promise<ProjectOptionsResult>>(
    'property-base-ui',
    'apis',
    'getProjectOptions'
  )
  if (!load) return { status: 'notConfigured' }
  const result = await load()
  if (result.status !== 'ready') return result
  const loadTree = moduleRegistry.getResourceItem<
    () => Promise<{ success: boolean; result: OrganizationNode[]; message?: string }>
  >('property-base-ui', 'apis', 'getOrganizationTree')
  if (!loadTree) throw new Error('Organization source unavailable')
  const tree = checked(await loadTree())
  const paths = new Map<string, NonNullable<ProjectOption['organizationPath']>>()
  const visit = (nodes: OrganizationNode[], parents: NonNullable<ProjectOption['organizationPath']>) => {
    for (const node of nodes) {
      const path = [
        ...parents,
        { id: node.id, name: node.name, ...(node.organizationType?.value === 'project' ? { isProject: true } : {}) }
      ]
      paths.set(node.id, path)
      visit(node.children || [], path)
    }
  }
  visit(tree, [])
  return { status: 'ready', options: result.options.map((p) => ({ ...p, organizationPath: paths.get(p.id) || [] })) }
}

interface OrganizationNode {
  id: string
  name: string
  organizationType?: { value: string } | null
  children?: OrganizationNode[]
}
