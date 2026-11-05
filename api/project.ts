import { moduleRegistry } from '@jetlinks-web-core/utils/module-registry'

/** 收费模块消费的公开项目选项；项目权限由提供方及业务后端校验。 */
export interface ProjectOption {
  id: string
  name: string
  organizationPath?: readonly { id: string; name: string }[]
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
  return load ? load() : { status: 'notConfigured' }
}
