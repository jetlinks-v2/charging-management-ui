import type { MenuFilterDefinition, MenuItem } from '@jetlinks-web-core/types/module'
import { isProjectApplicationScope } from '@jetlinks-web-core/utils/application-scope'

export const CHARGING_ROOT_MENU_CODE = 'charging-management'

const configurationPaths: Record<string, string> = {
  'charging/FinanceCompany': 'companies',
  'charging/FinanceTax': 'taxes',
  'charging/FinanceArrears': 'arrears'
}

/** 兼容已授权菜单的旧地址；只转换配置分组内已知页面，不覆盖自定义地址或补充授权。 */
function normalizeConfigurationPaths(menus: MenuItem[], parentCode?: string): MenuItem[] {
  let changed = false
  const normalized = menus.map((menu) => {
    const page = parentCode === 'charging/configuration' ? configurationPaths[menu.code] : undefined
    const url = page && menu.url === `/charging/finance/${page}` ? `/charging/configuration/${page}` : menu.url
    const children = menu.children ? normalizeConfigurationPaths(menu.children, menu.code) : menu.children
    if (url === menu.url && children === menu.children) return menu
    changed = true
    return children === menu.children ? { ...menu, url } : { ...menu, url, children }
  })
  return changed ? normalized : menus
}

/** 独立应用展开已授权的收费分组；项目入口保留完整的系统授权树。 */
export const chargingMenuFilter: MenuFilterDefinition = {
  code: 'charging-application-navigation',
  filter(menus, { applicationScope }) {
    const normalized = normalizeConfigurationPaths(menus)
    if (!applicationScope?.trim() || isProjectApplicationScope(applicationScope)) return normalized

    return normalized.flatMap((menu) => (menu.code === CHARGING_ROOT_MENU_CODE ? menu.children || [] : [menu]))
  }
}
