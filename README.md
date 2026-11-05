# 收费管理前端模块

本模块只承载收费业务。组织配置、用户管理、空间管理、客户管理、字典配置已经抽取到独立公共模块 `property-base-ui`，公共菜单显示名称为“物业基础管理”。

收费模块的 `baseMenu.json` 只维护收费业务菜单，不导入、不复制公共菜单。当前包含计费管理、应收管理、收银及资金、票据、财务账期与报表等业务入口。项目选择通过 property-base-ui 注册的公开 API 获取；基础模块未加载时明确提示不可用，不降级为无项目数据。

一、二级菜单图标统一配置在菜单节点的 `icon` 字段，二级菜单继续使用应用端的顶部标签导航。修改菜单配置后，已初始化的菜单需要在菜单管理中更新或重新初始化，刷新页面不会自动更新已保存的图标。

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
