# 收费业主 H5

独立 Vue 3 + TypeScript + Ant Design Vue 应用，参考报事 `employee-h5` 的认证、验证码、配置和部署方式。与 PC 收费模块分开构建，不修改 SaaS 底座。

```powershell
cd owner-h5
npm ci
npm run dev
# http://localhost:9301
npm test
npm run build
```

`public/config.json`：`applicationId` 为收费业务应用 ID，`apiBase` 为同源 `/api`，`allowedHostOrigins` 为允许宿主交接会话的来源（不需要嵌入时可设空数组）。当前应用 ID 是本地开发配置，部署前替换成目标环境收费应用 ID。开发代理通过 `FINANCE_API_PROXY` 配置，默认网关 `http://localhost:8800`，移除 `/api` 前缀；不要代理到物业服务绕过网关认证。

登录填写 SaaS 项目编码、应用账号及密码。项目编码不同于物业项目 ID、空间 ID、业务应用 ID。支持平台密码加密及图片/Altcha 验证码。账号和密码不写入配置，令牌仅保存在当前标签页 sessionStorage，重新进入会验证应用授权；401 清理登录。后端需要当前租户及有效应用认证。

## 功能及权限

- 首次多房选择，搜索、切换、恢复上次房屋并重新验证关联；空间不限层级。
- 本人被指定的房屋费用，共同收费对象看到同一账单的最新已收/待收；当前不直接支付欠费。
- 本人预收账户、可用余额、存入/抵扣/退款等流水；活动优惠不放入钱包。
- 本人缴费记录，按房屋过滤并分页加载，不展示其他付款人的支付信息。
- 业主不选择或查看收费科目、收费标准；自动匹配房屋的全部有效配置。普通月度 1–12 月，含季度费用时仅 3/6/9/12 月；活动仅用于已配置费用，其余费用按相同月数普通预存。逐项服务端报价，任一失败不显示部分合计，复核必须全部通过。
- 十分钟报价，复核时重新查询本人关系并重新计算；过期或来源变化必须重新试算。
- 本轮不接真实支付。确认页提供“确认支付”，先重新校验金额；渠道接入前提示“支付暂不可用，请稍后再试”并保留当前页面，不生成应收、实收、减免、资金流水和活动消费，不展示成功结果。

业务请求统一在 `src/api`，页面状态与异步隔离在 `src/hooks` / `src/services`。换房即清空旧数据，迟到响应不能覆盖新房；没有有效关联时展示空状态，保留退出登录入口。

## 后端契约

前缀 `/property/finance/owner`：

| 方法 | 路径 | 含义 |
| --- | --- | --- |
| GET | `/rooms` | 本人有效客户空间最小信息 |
| GET | `/projects/{project}/spaces/{space}/bills?paid=false&pageIndex=0&pageSize=20` | 被指定账单，待缴/已缴及完整筛选总额 |
| GET | 同空间 `/accounts` | 本人预收账户 |
| GET | 同空间 `/accounts/{account}/entries?pageIndex=0&pageSize=20` | 本人账户流水 |
| GET | 同空间 `/entries?pageIndex=0&pageSize=20` | 本人预收账户统一流水，按发生时间全局分页 |
| GET | 同空间 `/records?pageIndex=0&pageSize=20` | 本人收款记录 |
| GET | 同空间 `/prepay/options` | 已审批有效标准及适用活动 |
| POST | 同空间 `/prepay/quote` | `{settingId, activityId?, paidMonths, giftMonths}`；不接受付款人或金额 |
| POST | 同空间 `/prepay/revalidate` | `{quoteId}`；复核，不能收款 |

每次都由基础 `propertyService:ownerHouse` 本人只读命令重新核验：认证用户 → 有效客户 → 当前关联 → 已完善房屋及有效空间/项目绑定，并使用 TenantAssetsHolder 限定当前租户。不会授予员工组织/空间维护权限，不使用手机号匹配授权。所有私有字段由 DTO 限制，项目/空间 ID 不能扩大访问范围。基础命令不可用时直接失败。

分页最大 50；单房账单及本人收款候选查询有 10000 条显式上限，超限返回可见错误而非静默漏数；账户最多500，单账号关联最多1000。未来扩大此上限需先实现保持多付款人快照语义的数据库筛选，不能只取消保护。

## 部署

先部署并启动最新基础和收费服务（含新增命令与本人接口）。本功能不新增表或迁移 SQL，也不需要初始化员工按钮权限。业主账号必须在当前 SaaS 应用可登录，并在基础客户管理中有有效空间关联。

```powershell
npm ci
npm run build
docker compose -f compose.yml up -d --build
```

Nginx 只提供此 H5 和同源网关代理，默认端口9301；`config.json` 不缓存，构建资源长期缓存。配置网络名、网关域名及端口按部署环境调整。本次仅本地开发与验收，不代表已部署线上。

业主接口只返回自动匹配所需的配置 ID、结算周期和活动，不返回内部科目及标准名称；余额按房屋合计，统一流水继续按本人客户、项目、空间及有效预收账户过滤。
