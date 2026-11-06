# 收费管理前端模块

本模块只承载收费业务。组织配置、用户管理、空间管理、客户管理、字典配置已经抽取到独立公共模块 `property-base-ui`，公共菜单显示名称为“物业基础管理”。

收费模块的 `baseMenu.json` 只维护收费业务菜单，不导入、不复制公共菜单。以“收费管理”（`charging-management`）为系统根节点，收纳计费管理、应收管理、收银及资金、票据、财务账期与报表等原业务入口。项目选择通过 property-base-ui 注册的公开 API 获取；基础模块未加载时明确提示不可用，不降级为无项目数据。

菜单图标统一配置在节点的 `icon` 字段。项目权限入口保留完整系统分组；独立应用通过宿主的 `getMenuFilters` 扩展展开“收费管理”这一层，业务导航沿用原布局，只使用服务端已授权的子节点。原业务菜单 ID、编码、页面地址和按钮权限保持不变，物业基础管理不纳入收费根节点。已有环境需将新版定义同步到菜单管理与对应应用模板，核对原有子菜单授权；仅刷新前端不会更新服务端已保存的菜单树。

发票的“预览/打印发票”使用 `charging/FinanceInvoice:preview` 按钮权限，对应后端发票查询动作。交账审核、驳回、反审核、反交账统一使用 `charging/FinanceHandoverRecord` 下的按钮权限，交账明细仅保留创建交账权限；单笔和批量确认沿用同一动作授权。初始化后需在角色中授予所需按钮。

## 本地开发

在 `runtime-ui` 执行：

```powershell
pnpm --filter charging-management-ui dev
pnpm --filter charging-management-ui test
```

开发脚本同时加载收费、物业基础、认证三个模块，使用宿主已有登录和网关配置。

## 构建

```powershell
# 收费独立模块，产物 modules/charging-management-ui/dist。
pnpm --filter charging-management-ui build
# 收费与公共基础聚合宿主，产物 runtime-ui/dist。
pnpm --filter charging-management-ui build:with-base
```

独立部署时需同时部署并加载公共前端；聚合部署时公共模块已编入同一宿主。原有基础菜单地址与按钮编码继续由公共模块提供。

完整接入见公共仓库 [引用文档](../property-base-ui/docs/引用文档.md)，包含子模块配置、菜单初始化、公共接口和组件引用、权限与发布说明。原基础行为测试随实现迁移到公共模块，通过 `pnpm --filter property-base-ui test` 执行。

## 收费标准

左侧科目目录支持搜索目录与科目并保留父路径，选择已下发科目后新增；新增自动带入当前项目、科目，归属只读。计费方式切换使用服务端默认公式，公式通过独立编辑弹窗校验后确认，取消不影响原公式。税目选择保留分页检索，选中后展示公司、税号、分类、税率及含税信息；逾期金额/比例显示对应单位，日期可留空表示不限制。页面不提供刷新按钮，不接入流程审批。
