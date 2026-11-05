import baseMenu from './baseMenu.json'

type MenuItem = {
  children?: MenuItem[]
  [key: string]: unknown
}

// 基础菜单独立提供；仅标记收费自身菜单为运行端资源，由宿主决定应用归属。
const runtimeMenus = (items: MenuItem[]): MenuItem[] =>
  items.map((item) => ({
    ...item,
    runtime: true,
    children: item.children ? runtimeMenus(item.children) : undefined
  }))

export default () => runtimeMenus(baseMenu)
