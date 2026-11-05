# 收费管理前端模块

加载于 JetLinks SaaS `runtime-ui` 的收费管理业务模块，系统管理后端统一由 `D:\Work\saas\property-management` 的 `property-base-manager` 提供。

模块结构参考 `smart-park-access-ui`，通过宿主模块注册中心、动态路由及菜单机制集成。登录、API 代理、项目/租户和应用上下文使用宿主能力。

## 目录职责

| 路径                                        | 职责                                         |
| ------------------------------------------- | -------------------------------------------- |
| `index.ts`                                  | 宿主模块入口及 `views/**/index.vue` 页面发现 |
| `register.ts`                               | 对宿主公开的模块 API 与组件                  |
| `api/project.ts`                            | 对外公开的项目列表入口，复用空间项目查询     |
| `api/archive.ts`                            | 空间、房屋、客户、关系和字典接口与类型       |
| `hooks/archive/`                            | 档案范围、字典、编辑及 Excel 请求状态        |
| `utils/archiveFiles.ts`、`archiveImport.ts` | 文件响应错误识别及格式/大小检查              |
| `baseMenu.json` / `baseMenu.ts`             | 菜单定义及宿主运行端元数据装配               |
| `locales/lang/zh.json`、`en.json`           | 模块国际化文案                               |
| `views/`                                    | 后续收费业务页面及其局部逻辑                 |

菜单直接以“系统管理”为一级入口，不再设置外层“收费管理”。系统管理包含组织配置、用户管理、空间管理、客户管理和字典配置。空间与客户使用同一套项目及只读空间树，详情抽屉只读，资料通过列表编辑入口维护，不新增来源空间节点。

空状态统一复用宿主全局注册的 `CloudEmpty`，使用平台插图及描述样式；保留各页面已有的国际化提示、条件和操作按钮，不单独使用 `a-empty`。

客户当前列表提供详情、编辑和逻辑删除，沿用 `charging/Customer:save/delete` 按钮权限；有有效房屋关联时禁止删除主档，并提示先在编辑中结束关联，历史客户仅查看。详情不提供编辑或关联变更操作；编辑窗口维护资料与房屋关联，结束关联使用独立弹窗收集时间和原因，删除整份档案仅保留列表入口。业务失败通过统一消息提示展示后端文案，HTTP/网络异常使用国际化提示；必填校验显示在输入项下，不展示请求库异常原文。已逻辑删除的客户再次建档时，由后端在原权限范围内恢复原档案并新增本次关联，旧历史和误关联删除状态保持不变。

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

基础接口统一使用 `/property`。登录、租户及应用上下文由宿主提供；项目型档案请求显式传递 `projectId`，可选 `spaceId` 用于子树范围。项目列表不会替代后端资产权限校验。

API 基址和代理目标沿用宿主当前开发或部署配置，不在模块中固定地址。收费后端必须接入 SaaS 路由与集群；网关访问宿主机服务时还需要正确配置 RPC 端口映射和双方可达的注册地址。模块构建成功不代表网关到后端的网络链路已连通。

接口通过宿主 `request` 携带登录、项目及应用上下文，复用统一错误反馈。不要在本模块硬编码网关地址、读写 token、伪造 `X-Tenant-Id` 或添加独立登录逻辑。项目上下文不替代后端业务数据权限。

通过 SaaS 菜单管理增量导入本模块 `baseMenu.json`，授权各页面及所需按钮；不要使用全量菜单初始化覆盖其他模块。组织类型菜单关联 SaaS 原 `organization` 资产，类型标注不代替数据授权。

## 项目列表接入

空间和客户的项目选项来自 `GET /property/space/_projects`：返回当前用户可读且已标注为项目的组织。组织配置中将组织标注为项目，再将真正根空间绑定该组织；没有可访问项目时页面显示空态，不填充演示项目。

页面通过 `getSpaceProjects()` 查询；对外公开的 `api/project.ts#getProjectOptions()` 复用同一接口并返回 `{ status: 'ready', options }`。为调用方兼容保留 `notConfigured` 类型分支，实际接口已接入，不再返回该状态。请求失败抛出错误，不能转为成功的空数组。选定项目前不查询空间树或执行档案操作。

## 独立仓库与宿主接入

本模块独立维护于 `git@github.com:jetlinks-v2/charging-management-ui.git`，分支 `2.20`；`runtime-ui` 只记录子模块引用，不存放模块源码副本。宿主更新子模块引用前，先将对应子仓库提交推送到远程，避免其他开发人员无法拉取。

在宿主根目录首次接入或拉取时执行：

```powershell
git submodule update --init --recursive modules/charging-management-ui
```

Vue、宿主组件和构建工具由 `runtime-ui` workspace 提供，不能脱离宿主单独启动。模板、导入和导出由物业后端提供，前端只上传原文件和下载 Blob，不安装独立 Excel 解析库。登录、请求、权限、国际化和页面组件仍由宿主集成。

## 组织配置

页面目录为 `views/charging/OrganizationType/`；请求集中在 `api/organization.ts`，交互状态在 `hooks/useOrganizationType.ts`，树筛选在 `utils/organizationTree.ts`。选择项目或外协单位后即时保存，清除使用显式 `null`，并发冲突不自动覆盖。组织菜单代码继续保留 `charging/OrganizationType`。根空间关联使用 `/property/space/_roots` 和 `/space/{rootId}/organization`，绑定与解绑带来源版本；同步空间使用 `/space/_sync`。

页面调用 `/property/organization` 下的 `_tree`、`_types`、`{id}`、`{id}/type`、`_sync`、`_sync/status`，由物业基础模块维护同一份组织镜像和类型。首次、定时、手动同步全部由后端通过 SaaS 命令服务执行，前端不持有系统凭证。

其他业务前端需要该界面时可复制上述页面、hook、API、utils、`OrganizationSpaces` 及相关国际化文案，并新增自己的菜单代码、按钮授权；修改 hook 中 `organizationPermission` 为新菜单代码即可。后端资源权限仍使用 `property-organization:query/save/sync`，不能各自维护组织表或引入收费模块的内部实现。

## 用户管理

菜单为“系统管理 → 用户管理”，页面 `views/charging/User/`；API 在 `api/user.ts`，列表、详情标注、同步状态分别在 `hooks/useUserList.ts`、`useUserDetail.ts`、`useUserSync.ts`。页面复用宿主面包屑、ConditionFilter、ProTable、JlDrawerShell，账号资料只读，不添加重复页面大标题。

用户来自物业基础模块的 SaaS 镜像，身份可同时为客户和员工（稳定编码仍为 `owner`、`employee`），取消所有选项发送 `[]` 清空；同步不覆盖身份。标注使用 version CAS，失败读取最新详情供操作者确认，不自动重试写入。停用账号保留展示，不能修改身份。身份不自动绑定房屋或授予缴费权限。

重启物业后端，使用 SaaS 菜单管理**增量导入**本仓库 `baseMenu.json` 中的用户管理菜单，授予 `property-user:query/save/sync`，菜单代码 `charging/User`，数据权限关联原 `user` 资产。宿主若使用模块白名单，应包含 `charging-management-ui`。前端不新增登录，也不请求浏览器直接同步 SaaS 账号。

界面只在后台任务真正成功后刷新；失败保留当前数据，并提供刷新状态和重新同步操作。`_counts` 对当前公共筛选和权限范围计数，客户/员工可能重叠；组织筛选可包含可见下级。其他业务前端需要时复制页面、hooks、API、utils、UserManagement 国际化及对应菜单，改为自己的菜单权限代码，共用基础模块接口和同一份身份数据。

## 空间、客户与字典档案

| 菜单代码              | 页面 / API                                                                | 主要行为                                                                                                         |
| --------------------- | ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `charging/Space`      | `views/charging/Space/`；`/property/space`、`/property/house`             | 项目下任意层级空间树只读，按来源 `leaf` 判定末端；仅维护房屋扩展资料，路径按来源原样显示；查询权限可打开只读详情 |
| `charging/Customer`   | `views/charging/Customer/`；`/property/customer`、`/property/user/_query` | 已完善的末端房屋可新建或关联客户；账号来源只选 `owner=true AND status=1`，不按项目组织限制来源账号               |
| `charging/Dictionary` | `views/charging/Dictionary/`；`/property/dictionary`                      | 分类与选项的新增、名称/说明/排序维护、启停和逻辑删除；已保存的编码不可修改                                       |

客户主档按项目和账号建立，姓名、电话、邮箱从账号回显后可以在物业侧编辑，保存不回写 SaaS 账号。个人客户需要性质和新建/已有家庭；企业客户不提交个人证件、性质或家庭字段。主档支持编辑，房屋关系支持新增、结束和误建逻辑删除；当前与历史分开查询，历史按每次已结束关系显示起止和原因，保留已删除主档的历史详情。

业务下拉读取四个固定分类 `house-type`、`house-state`、`customer-nature`、`certificate-type`。分类和选项都启用才可新增选择；空字典从字典页维护，不初始化虚构选项。停用项仍用于历史解析，未知编码显示原值。删除被业务引用项、固定业务分类或非空分类时由后端拒绝，界面显示返回原因。

Excel 模板由 `GET /property/{house|customer}/template.xlsx?projectId=` 提供，包含中文表头、当前项目的真实空间、字典及客户用户参考。房屋模板只预填待完善空间，全部已完善仍可下载，所有空间保留在参考表。导入使用 `POST /property/{house|customer}/_import?projectId=` 上传 multipart 的 `file` 原文件，后端解析第一张数据表，整批校验通过后才事务写入；任何错误都不部分保存，并返回实际 Excel 行号及原因。仅 `.xls/.xlsx`，1–500 行，10MB。客户下载模板和导入均必选个人或企业（`customerType=person/company`）；个人填写家庭方式和家庭名称，同文件同房屋同名新家庭归组。导出 `POST /property/{house|customer}/_export` 返回 XLSX，保留项目、子树和筛选；最多 10000 条，超限明确拒绝。接口复用现有 `import/export` 按钮权限，操作失败统一消息提示，JSON Blob 错误不会被保存成文件。

## 菜单和按钮授权

更新页面后，在 SaaS 菜单管理**增量导入**本模块 `baseMenu.json`，保留已有菜单和其他模块，不做全量初始化。原 `charging/OrganizationType`、`charging/User` 代码不变，新页面按上表代码导入。普通查询和业务维护分别授权；不要为了下拉显示而授予字典维护权限。

| 能力                 | 后端资源 / 动作                                            |
| -------------------- | ---------------------------------------------------------- |
| 组织查询、标注、同步 | `property-organization:query/save/sync`                    |
| 根空间绑定 / 同步    | `property-space:save/sync`；组织页按钮 `bind`、`spaceSync` |
| 空间与项目树查询     | `property-space:query`                                     |
| 房屋档案             | `property-house:query/save/delete/import/export`           |
| 客户管理和关系       | `property-customer:query/save/delete/import/export`        |
| 客户账号来源         | `property-user:query`；用户身份和同步另按 `save/sync` 授权 |
| 字典读取 / 维护      | `property-dictionary:query` / `save/delete`                |

空间页同时需要空间、房屋及字典查询；客户页同时需要客户、空间、房屋及字典查询，新建与导入还需要来源用户查询。`baseMenu.json` 已组合这些依赖查询权限。模板调用后端专用文件接口，沿用导入权限，不要求房屋导出权限；导入/导出按钮使用独立动作，不等同于保存/查询。后端仍按资源和资产范围独立验证每次操作。

房屋导入模板可在全部房屋已完善时下载：填写页仅预填未完善房屋，“空间参考”列出整个项目的房屋和完善状态；已有房屋资料仍通过编辑入口修改。导入、导出、保存、同步等操作失败统一使用消息提示，不在页面或弹窗内追加报错横幅。

## 独立票据与开票规则

票据管理的三个二级菜单为 `charging/FinanceInvoice`、`charging/FinanceReceipt`、`charging/FinanceDocumentRule`。增量导入 `baseMenu.json` 后分别授权 `property-finance-invoices:query/create/reverse`、`property-finance-receipts:query/create/void` 和 `property-finance-document-rule:query/save`；不在收银台增加开票入口。

发票与收据台账共用项目选择、条件筛选和后端分页。开具分三步：选择同客户及销方的历史来源，填写购方和逐行金额（差额征收同时提供凭证及附件），核对后端返回的金额、税额、销方快照后确认。来源为应收款或临时收款主单，混合支付不重复选入；额度耗尽和超期开票来源明确禁选。金额使用字符串，不由浏览器计算财务税额。

发票明确显示“模拟”状态，红冲单独生成关联负金额票据；收据作废保留原记录，付款关联限制由后端验证。详情及日志只读，不开放票据编辑删除。开具、红冲和作废的未知网络结果按当前账号、租户、应用、项目、票据类型和操作保存原请求，仅可用原请求恢复，期间禁止切换项目或重复发起。错误统一消息提示；结果待确认是业务状态提示，不展示原始HTTP错误。

开票规则先只读展示，分区编辑后携带原版本及原因保存，冲突保留输入。未配置时显示自然年、最大重开0次；重开次数留空表示不限次数。页面及按钮仍须由SaaS授权，后端独立校验项目与全部关联房屋资产。

## 会计账期与财务月结

菜单为“收款管理 → 财务月结”，代码 `charging/FinanceMonthClosing`，页面目录 `views/charging/FinanceMonthClosing`，接口封装 `api/financeAccounting.ts`，状态与恢复逻辑在 `hooks/finance-month-closing`。

选择项目和年度后查看十二个真实账期，选中账期查看结账历史。年度须显式创建，可选择自然月或1—28日自定义开账日；调整日期一次提交全年十二期及各自版本，界面校验全年连续，后端继续核对关闭及已有账务限制。月结规则在当前页展开维护，按项目和版本保存，应收审核开关不取消交账审核要求。区域内分为应收审核规则、自动月结和自动执行记录三个页签。自动月结默认关闭，可选择月末或1—28日指定日，在实际账期结束之后执行；启用须同时具备月结规则及月结按钮权限。配置版本与会计账期版本独立，并发拒绝保留本次输入，保存期间锁定页签及关闭。执行记录按项目分页只读查看，展示明确的业务失败及恢复建议；人工反结后需重新保存调度才允许自动重结。

月结与反结先填写原因、核对后端预览，再确认。预览发生版本变化时要求刷新，不能用新版本覆盖旧确认。待交账、交账待审核或规则要求的应收未审核时不可确认月结。日期、结账顺序和最终来源资格由后端验证，金额均使用后端精确字符串，不在浏览器计算。

未知结果以原项目、月份、动作、版本、原因、预览及请求号保存在当前账号、租户和应用入口隔离的会话存储中。存储失败不发确认；恢复时重发原载荷，不因当前目录状态或版本已变化生成新操作。结果未确认期间锁定项目切换、年份和其他写入。详情及冻结来源只读、分页，接口业务错误通过统一消息提示。

菜单查询同时需要 `property-finance-accounting-periods:query` 和 `property-finance-month-closing:query`。按钮 `create/edit/save/close/reopen` 分别对应会计目录 `create/save` 和月结 `save/close/reopen`。部署后增量导入 `baseMenu.json` 并分配需要的按钮权限；后端仍独立校验项目和全部冻结空间权限。

## 应收按钮审核

应收列表提供单笔及批量审核、驳回、反审核，并显示审核状态；旧记录没有审核状态时显示待审核，详情只展示审核日期、审核人及原因。操作使用同一审核确认组件，每批最多100笔，只有整批均具备后端返回的对应 `allowedOperations` 才可发起；后端整批校验和事务提交。

按钮仍使用菜单 `charging/FinanceReceivable`，增加 `approve/reject/unapprove`，分别对应资源 `property-finance-receivable` 的同名动作。未知结果保持原请求号、原账单及版本，恢复前不允许再发起批次；审核不进入工作流，不改变金额，不在收银台增加审核或开票操作。

## 应收统计

菜单为“财务报表 → 应收统计”，代码 `charging/FinanceReceivableReport`。接口在 `api/financeReport.ts`，状态与请求竞争隔离在 `hooks/finance-report`，页面在 `views/charging/FinanceReceivableReport`。菜单查询权限 `property-finance-report-receivable:query`；导出和打印按钮对应同一资源的 `export`。部署后增量导入 `baseMenu.json` 并分配需要的按钮权限，不需要更改宿主菜单壳层。

默认使用当前项目，可在报表内多选已授权项目；这份统计范围不改变应用全局项目。查询按到期日、客户、房屋名称、账单编号及收款状态筛选。项目和科目汇总支持单行或勾选多行下钻账单明细，科目条件保留为可清除标签。摘要展示全筛选范围的减免前应收、减免、净应收、已收、未收及收缴率；表格翻页不以当前页重新合计。只统计已审核、未删除且不是拆分父账的账单，计算截至日和实际计费日期均可见，金额直接显示后端精确文本。

草稿须查询后生效；刷新、分页、Excel、PDF 和打印始终使用已应用的筛选，不会悄悄导出未查询的草稿。导出期间锁定筛选和全局项目切换；账号或项目上下文重置会丢弃旧响应及旧文件。打印使用后端 PDF 预览和浏览器原生打印能力，关闭预览释放临时地址。后端错误只通过统一消息提示，失败时清除过期摘要，超出10000行明确提示缩小范围，不生成截断文件。

## 实收统计界面

`charging/FinanceReceivedReport` 提供现金实收明细、项目、科目、收款方式与来源类型汇总，统一调用 `/property/finance/reports/received`。必选项目范围默认当前项目，可在本报表中多选；不会擅自切换全局项目。收款方式及科目通过汇总行钻取，显示可清除条件，名称来自服务端冻结快照。

筛选草稿需点击查询才生效，翻页、刷新、下载和打印共用已应用条件。发生日落入费用期间才为本期，非本期含未提供期间的流水；未筛选收款日期时隐藏本期/非本期，避免显示虚假分类。退款显示正数，净实收按现金方向可为负数；浏览器不对正式资金金额做浮点计算。

沿用 Ant/JetLinks 报表布局与表格分页，操作失败仅消息提示，清空旧汇总而不渲染后台 JSON。导出和打印使用独立按钮权限 `charging/FinanceReceivedReport:export`。`useReportExport`、`ReportExportActions` 和 `ReportPdfPreview` 为应收/实收报表共用能力，负责冻结筛选、项目守卫、迟到响应失效及预览资源释放；具体金额与来源字段由各自 typed API/hook 承担。
