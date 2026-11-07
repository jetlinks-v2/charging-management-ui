---
name: "业主 H5 · 社区服务账本"
description: "以房屋、月份和金额为中心的社区缴费与余额账本。"
colors:
  accent: "#0879bc"
  accent-hover: "#076ba7"
  ink: "#21394d"
  muted: "#526b7e"
  image-caption: "#3c5d75"
  line: "#e8eff5"
  canvas: "#f5f8fc"
  tint: "#e8f5ff"
  surround: "#e8f1f8"
  surface: "#fff"
  control-border: "#dbe7f0"
  choice-border: "#d4e5f2"
  balance-surface: "#e4f4ff"
  balance-divider: "#c4def0"
  positive: "#327354"
  topbar-surface: "#eaf6ff"
  tag-success-ink: "#237343"
  tag-success-surface: "#eef8ee"
  tag-warning-ink: "#9b5106"
  tag-warning-surface: "#fff4e2"
  tag-info-ink: "#086ba9"
  warning: "#8e5c1f"
  error-surface: "#fff0e9"
  error-ink: "#914028"
typography:
  display:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif'
    fontSize: "38px"
    fontWeight: 650
    lineHeight: 1.2
    letterSpacing: "-0.03em"
  headline:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif'
    fontSize: "23px"
    fontWeight: 600
    lineHeight: 1.45
    letterSpacing: "-0.02em"
  title:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif'
    fontSize: "17px"
    fontWeight: 600
    lineHeight: 1.5
  body:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif'
    fontSize: "15px"
  control:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif'
    fontSize: "14px"
  label:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif'
    fontSize: "13px"
  navigation:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif'
    fontSize: "11px"
rounded:
  tag: "5px"
  control: "12px"
  surface: "14px"
  panel: "16px"
  sheet: "20px"
  pill: "22px"
  circle: "50%"
spacing:
  choice-gap: "8px"
  row-gap: "12px"
  narrow-inset: "14px"
  narrow-gutter: "16px"
  inset: "18px"
  gutter: "20px"
  section: "24px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.surface}"
    rounded: "{rounded.control}"
    typography: "{typography.body}"
    height: "46px"
    padding: "0 20px"
  primary-link-hover:
    backgroundColor: "{colors.accent-hover}"
    textColor: "{colors.surface}"
  primary-link:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.surface}"
    rounded: "{rounded.control}"
    typography: "{typography.body}"
    height: "46px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    typography: "{typography.control}"
    height: "44px"
  activity-chip:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    typography: "{typography.label}"
    padding: "9px 12px"
  activity-chip-selected:
    backgroundColor: "{colors.tint}"
    textColor: "{colors.tag-info-ink}"
  prepay-entry:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.surface}"
    rounded: "{rounded.surface}"
    padding: "16px 18px"
    height: "64px"
  semantic-tag:
    rounded: "{rounded.tag}"
    padding: "0 6px"
  month-option:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "10px 5px"
    height: "68px"
  month-option-selected:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.surface}"
  list-surface:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.surface}"
    padding: "0 18px"
  balance-panel:
    backgroundColor: "{colors.balance-surface}"
    rounded: "{rounded.panel}"
    padding: "18px"
  bottom-navigation:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.muted}"
    typography: "{typography.navigation}"
    width: "100%"
---

# Design System: 业主 H5 · 社区服务账本

## Overview

**Creative North Star: "社区服务账本"**

以可读、可信、便于核对的社区账本承载缴费、预存和余额查询。天蓝主题、浅蓝灰画布与清楚的白色内容分组建立稳定的视觉秩序；房屋、月份、金额与交易状态构成主要信息，避免营销式表达。

信息以紧凑连续行组织，白色区域只用于必要分组。页面顶部以淡蓝化建筑实景作为低对比装饰，向下渐淡，账目区域保持清楚。房屋身份直接落在页面背景上，金额依靠字号、字重和对齐建立重点，避免大白块、同尺寸卡片墙与卡片套卡片。本文件记录当前实现，抽取来源为 `src/style.css`、`src/styles/layout.css` 和 `src/main.ts`；不作为功能或浏览器测试通过证明。

**Key Characteristics:**
- 天蓝主操作、淡蓝建筑背景与克制的白色内容分组。
- 房屋、月份、金额优先，账单和流水保持连续行阅读。
- 等宽数字、稳定右对齐与有限的辅助文字。
- 单列移动端布局，固定导航和操作区适配安全区域。

## Colors

天蓝主色承担操作和选中反馈，浅蓝灰中性色承担背景、层次和阅读；绿、橙等状态色仅承担必要的交易提示。

### Primary
- **天蓝**（`accent`）：主操作、选中项、链接、礼赠图标和焦点轮廓。
- **深天蓝悬停色**（`accent-hover`）：预存入口与主要链接的悬停状态。
- **晴空浅蓝**（`tint`）：活动选中项、当前房屋标签、信息标签与导航选中图标衬底。

### Secondary
- **交易提示色**（`positive`、`warning`）：收入金额与退款等必要状态；状态仍需文字说明。
- **错误提示色**（`error-surface`、`error-ink`）：价格加载失败等需要处理的错误。
- **语义标签色**：成功使用 `tag-success-ink` 与 `tag-success-surface`，提醒使用 `tag-warning-ink` 与 `tag-warning-surface`，信息使用 `tag-info-ink` 与 `tint`。标签保留文字识别，不只依赖颜色。余额区链接复用 `tag-info-ink`。

### Neutral
- **浅蓝灰画布**（`canvas`）：应用内页面底色；**外围浅蓝**（`surround`）用于容器之外；**顶部浅天蓝**（`topbar-surface`）用于粘性顶部栏。
- **深蓝灰墨色**（`ink`）：主要信息；**蓝灰辅助色**（`muted`）：时间、说明、输入提示文字和次级入口。背景上的房屋位置及路径采用更深的 `image-caption`；房屋切换按钮保留白底。
- **白色内容面**（`surface`）：账单、连续列表、输入框与底部导航。
- **浅蓝灰分隔线**（`line`）：连续行与固定底栏分界。控件和选项边框分别使用 `control-border` 与 `choice-border`，保持当前来源的细微差别。
- **余额浅蓝面**（`balance-surface`、`balance-divider`）：余额区域与内部操作分界。
- **列表悬停**：只用主要文字与图标变色反馈，保持行背景透明，不添加方形底色。

**The Action Color Rule.** 天蓝主色用于行动和选中状态，低对比浅蓝用于环境与衬底，不把正文区域染成饱和主色。

## Typography

**Display Font / Body Font:** 系统无衬线字体栈，按平台使用 Apple、Segoe UI、苹方或微软雅黑回退。没有独立装饰字体或等宽字体；金额通过 `tabular-nums` 对齐。

**Character:** 清楚直接的中文界面排版。字号随信息任务变化，不采用等比展示型字号阶梯。

### Hierarchy
- **Display**：主金额采用前置令牌；首页账单合计缩至（34px），确认页主金额扩大至（42px），小数与币种分层但保持同一基线。
- **Headline**：房屋名称采用前置令牌，长名称允许换行；窄屏缩至（21px）。
- **Title**：分组和普通顶部标题采用前置令牌；根页面顶部标题为（19px）。
- **Body / Control**：全局基础文字与控件文字使用各自令牌，账单和流水正文通常为（14–15px）。段落行高为（1.7）。
- **Label**：次级入口使用前置令牌；时间通常为（12px），底部导航为（11px）。这些小号字只用于辅助层级。

**The Amount Alignment Rule.** 金额使用等宽数字并保持列对齐；不要用密集小字替代可直接核对的月份与价格。

## Layout

应用为居中的单列移动端容器，最大宽度（480px），最小页面宽度（320px），最小高度（100dvh）。全页水平边距使用 `gutter`；屏幕宽度不超过（350px）时切换到 `narrow-gutter`。内容容器内边距对应 `inset`，同一窄屏条件下切换到 `narrow-inset`。登录页保留现有独立内边距（60px 28px 32px），不将其误认为通用页面边距。

顶部栏基础高度（58px），叠加顶部安全区域；普通页面底部预留（100px），带固定操作区的页面预留（126px）并叠加底部安全区域。固定导航与固定操作区均居中，宽度不超过应用容器；导航上下基础内边距（9px），操作区上下基础内边距（14px），底部另加安全区域。

连续账单、缴费与流水用行内留白和细分隔线组织，不拆成独立大卡片。预存月份使用三列等宽选项，默认间距取 `choice-gap`，窄屏为（7px）；每个选项直接展示月份和金额。主操作区、右侧金额与长房屋名称必须共同适应窄屏。

顶部装饰背景使用本地打包资源 `src/assets/community-sky.webp`，高度（310px），水平居中、顶部对齐并铺满该区域；遮罩在高度（65%）之后渐淡到透明。背景为装饰，不承载文字信息、不拦截指针，白色内容面不透出建筑图案。资源来源与处理记录保留在 `src/assets/community-sky.webp.json`，记录 Unsplash 实景建筑来源及本地淡蓝化、镜像和渐淡处理；该图不是项目实拍。

## Elevation & Depth

移动端以色面、边框和间距分层，内容面及主按钮不依赖阴影。仅在视口宽度至少（600px）时，应用外壳使用（`0 8px 48px #244d7012`）的柔和阴影，区分容器与外围背景；底部固定区域用顶部细线界定。

**The Flat Ledger Rule.** 日常账目保持平面连续阅读，不为每行叠加阴影或制造悬浮卡片。

## Shapes

控件和月份选项使用 `control` 圆角，普通列表面使用 `surface`，账单总览、余额与确认容器使用 `panel`。弹出抽屉只在顶部使用 `sheet` 圆角。 业主端抽屉与页面同宽、居中且不超过480px；选房按内容自适应高度，最高为视口80%或620px，超出仅滚动内部内容；抵扣明细最高为视口85%或720px。活动选项为 `pill`，状态标签为 `tag`；头像与流水图标使用圆形。圆角只服务容器识别，不添加票据锯齿、斜切或拟物纹理。

## Components

### Buttons

主按钮稳重、可直接触达。组件库基础控件高度为（44px），底部主按钮与结果页主要链接使用前置组件令牌，其中高度语义为最小高度的链接仍允许内容扩展。底部按钮默认最小宽度（126px），窄屏减为（106px）；不将底部尺寸强制套到所有按钮。

深色入口和主要链接的悬停色取 `accent-hover`；全局可见键盘焦点为主色实线（2px），外偏移（4px）。禁用按钮不响应指针操作，透明度为（0.55）。展开箭头使用变换过渡（0.2s）；减少动态效果偏好下关闭动画和过渡。

### Chips

活动选项以白底、细边框与紧凑横向内边距组成，选中时切换浅蓝底与天蓝边框，文字使用更深的 `tag-info-ink`；当前房屋标签同样使用这一深蓝文字。月份选项独立为三列选择器，选中使用天蓝底与白色文字；月份和价格始终并列于同一选项，不把价格藏到试算步骤。语义标签采用前置状态颜色配对，保持浅底与清楚的深色文字。

### Cards / Containers

白色内容面只为账单或相关连续行分组，统一使用既有圆角和内边距；相邻账单、缴费和流水通过细线分开。余额容器使用浅蓝色，与普通白色列表区分。结果容器的居中表达属于结果页，不扩展成所有页面的大金额卡。

### Inputs / Fields

输入框遵循组件库配置的控件字号、高度和圆角，登录表单使用白色背景。边框使用 `control-border`，文本使用 `ink`，光标使用 `accent`；占位文字使用 `muted` 且透明度为（1），键盘焦点沿用全局可见轮廓。错误信息用明确文本配合错误色面，不伪装成正常报价。

### Navigation

底部固定导航提供房屋、余额、我的三个入口，图标（21px）与标签纵向排列。未选中使用辅助色，选中使用主色和（600）字重，图标增加浅蓝圆角衬底。导航保留底部安全区域，不覆盖最后一行内容；顶部次级页面通过返回按钮和标题说明当前位置。

### 账单与流水行

账单行将月份标题放在左侧，金额与必要状态放在右侧，展开后的明细采用左右键值对。流水行以简洁图标、业务名称、时间和右对齐金额组成；金额使用等宽数字，时间保持辅助层级。无需为每个字段重复增加说明标签。

## Do's and Don'ts

### Do:
- **Do** 使用天蓝主操作、淡蓝建筑背景和必要的白色分组保持账本秩序。
- **Do** 保持全页（20px）边距，宽度不超过（350px）时使用（16px），应用最大宽度保持（480px）。
- **Do** 让房屋、月份、金额和交易状态成为每一屏的主要信息。
- **Do** 直接展示各月份选项的价格，确认页使用正式支付文案；渠道不可用时仅在操作后提示，不展示开发说明或未完成支付的成功页。
- **Do** 为固定底栏预留空间、适配安全区域，并保留可见键盘焦点与减少动态效果支持。

### Don't:
- **Don't** 使用大白块、同尺寸卡片墙、卡片套卡片或装饰性大金额面板稀释账目信息。
- **Don't** 在预存流程重新加入科目标准、试算入口或必须另点一步才能看到的月份价格。
- **Don't** 通过泛滥的小字、营销文案或虚构状态填充页面，也不要让背景图干扰金额与正文阅读。
- **Don't** 把登录页、结果页或桌面外壳的局部尺寸和阴影扩展为通用页面规则。
