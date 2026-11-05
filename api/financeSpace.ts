import { moduleRegistry } from '@jetlinks-web-core/utils/module-registry'

/** 收费筛选只消费基础模块的只读空间树，不维护来源空间。 */
export interface FinanceSpace {
  id: string
  name: string
  spaceTypeName?: string
  spaceLocation?: string
  children?: FinanceSpace[]
}

export async function getFinanceSpaceTree(projectId: string): Promise<FinanceSpace[]> {
  const load = moduleRegistry.getResourceItem<(project: string) => Promise<FinanceSpace[]>>(
    'property-base-ui',
    'apis',
    'getSpaceTree'
  )
  if (!load) throw new Error('Space source unavailable')
  return load(projectId)
}
