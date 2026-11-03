# 收费管理前端模块

加载于 JetLinks SaaS `runtime-ui` 的收费管理业务模块，基础资料后端统一由 `D:\Work\saas\property-management` 的 `property-base-manager` 提供。

模块结构参考 `smart-park-access-ui`，通过宿主模块注册中心、动态路由及菜单机制集成。登录、API 代理、项目/租户和应用上下文使用宿主能力。

## 目录职责

| 路径 | 职责 |
| --- | --- |
| `index.ts` | 宿主模块入口及 `views/**/index.vue` 页面发现 |
| `register.ts` | 对宿主公开的模块 API 与组件 |
| `api/context.ts` | 收费后端上下文接口及返回类型 |
| `api/project.ts` | 空间、客户档案共用的项目列表接入入口 |
| `baseMenu.json` / `baseMenu.ts` | 菜单定义及宿主运行端元数据装配 |
| `locales/lang/zh.json`、`en.json` | 模块国际化文案 |
| `views/` | 后续收费业务页面及其局部逻辑 |

已提供“收费管理 → 基础资料 → 组织类型配置”页面。空间、客户、字典及其他收费页面继续按各自设计实现。

## 开发与构建

在 `runtime-ui` 根目录执行：

```powershell
pnpm --filter charging-management-ui dev
pnpm --filter charging-management-ui build
pnpm --filter charging-management-ui typecheck
pnpm --filter charging-management-ui test
```

`dev` 在宿主中加载收费与认证模块，使用宿主开发配置的端口和 API 代理。已存在前端进程时不要重复启动占用同一端口；如果原进程使用 `--module-name` 白名单，需将 `charging-management-ui` 加入该名单并重启。

未限定模块名单的宿主自动扫描本目录，无需修改共享组件或增加 iframe。`build` 输出模块扩展产物到本目录 `dist/`；包含业务页面后还应执行宿主构建，验证页面路由编译。

## 后端访问

`getChargingContext()` 调用 `/park/charging/context`，返回宿主标准响应对象。成功后从 `response.result` 读取 `userId`、`username`、`projectId`，其中 `projectId` 可能为 `null`。接口封装不接受用户/项目 ID 参数。

前端 `/api` 继续代理到 Docker SaaS 网关 `http://127.0.0.1:8800`。收费后端必须加入同一运行端集群并发布对应路由；Docker 网关访问宿主机服务还需要正确配置集群、RPC 端口映射及双方可达的注册地址。模块构建成功不代表这条网络链路已经连通。

接口通过宿主 `request` 携带登录、项目及应用上下文，复用统一错误反馈。不要在本模块硬编码网关地址、读写 token、伪造 `X-Tenant-Id` 或添加独立登录逻辑。项目上下文不替代后端业务数据权限。

通过 SaaS 菜单管理增量导入本模块 `baseMenu.json`，授权查询、标注、同步按钮；不要使用全量菜单初始化覆盖其他模块。组织类型菜单关联 SaaS 原 `organization` 资产，类型标注不代替数据授权。

## 项目列表接入

项目管理及项目列表接口由其他开发人员提供，本模块不新增项目管理后端，也不猜测接口地址。空间档案和客户档案统一通过 `api/project.ts` 的 `getProjectOptions()` 读取项目选项，该入口也通过模块 `apis` 发布。

目前返回 `{ status: 'notConfigured' }`，表示接口尚未接入；这与 `{ status: 'ready', options: [] }`（查询成功但没有可选项目）不同。页面接入时分别处理未就绪、加载失败、无数据状态；未选有效项目时不查询空间树、不执行新增或导入，不填充演示项目或默认项目 ID。

对接时在该入口使用宿主 `request` 调用真实接口，检查标准响应是否成功，再把项目映射成 `{ id: string, name: string }`，返回 `{ status: 'ready', options }`。接口失败按宿主约定抛出错误，不转换为空数组；保留宿主的登录及上下文处理。下拉数据应为当前用户可访问的项目，业务后端仍需独立校验项目数据权限。

## 独立仓库与宿主接入

本模块独立维护于 `git@github.com:jetlinks-v2/charging-management-ui.git`，分支 `2.20`；`runtime-ui` 只记录子模块引用，不存放模块源码副本。宿主更新子模块引用前，先将对应子仓库提交推送到远程，避免其他开发人员无法拉取。

在宿主根目录首次接入或拉取时执行：

```powershell
git submodule update --init --recursive modules/charging-management-ui
```

模块依赖由宿主 workspace 提供，不能脱离 `runtime-ui` 单独启动。通过宿主的登录、请求、权限、国际化和页面组件集成。

## 组织类型配置

页面目录为 `views/charging/OrganizationType/`；请求集中在 `api/organization.ts`，交互状态在 `hooks/useOrganizationType.ts`，树筛选在 `utils/organizationTree.ts`。选择项目或外协单位后即时保存，清除使用显式 `null`，并发冲突不自动覆盖。

页面调用 `/property/organization` 下的 `_tree`、`_types`、`{id}`、`{id}/type`、`_sync`、`_sync/status`，由物业基础模块维护同一份组织镜像和类型。首次、定时、手动同步全部由后端通过 SaaS 命令服务执行，前端不持有系统凭证。

其他业务前端需要该界面时可复制上述页面、hook、API、utils 和 `OrganizationType` 国际化文案，并新增自己的菜单代码、按钮授权；修改 hook 中 `organizationPermission` 为新菜单代码即可。后端资源权限仍使用 `property-organization:query/save/sync`，不能各自维护组织表或引入收费模块的内部实现。
