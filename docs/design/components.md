# UI 组件与交互机制

这份文档是公共组件与交互控制器的权威来源。视觉方向见 [UI/UX 规范](ui-ux.md)，内容格式见 [内容设计](../../02-content-design.md)。

## 约定

- 全站视觉由 `src/components/ui/` 的基础组件组合而成，业务组件（`Card`、`Pagination`、`Backdrop`、页头页脚）只负责内容与布局。
- 布局、间距、排版、响应式、颜色和交互状态优先使用 Tailwind 工具类。`src/styles/global.css` 只保留主题变量、基础样式、Markdown 排版、几何绘制与必要关键帧；被替代的旧规则必须删除，不允许两套样式并行。
- 组件通过类型明确的 `variant`、`size`、状态属性和插槽表达差异，用 `data-state` 与 ARIA 属性把样式和控制器连起来。
- 不使用系统下拉框、`details`/`summary`、`dialog`，也不使用 `alert`／`confirm`／`prompt` 承担产品交互。源码与生产产物都由 `scripts/check-output.ts` 检查。
- 脚本专属控件带 `.js-only`，无脚本时隐藏并显示 `.no-js-only` 的静态回退入口；折叠内容在无脚本时保持展开可读。
- 脚本可用性隐藏规则位于 utilities 层，避免被 flex / inline-flex 工具类覆盖；不以强制 block 覆盖组件布局。搜索初始化按表单节点去重，load 与 page-load 同时触发也只能接线一次。

## 基础组件（`src/components/ui/`）

| 组件 | 关键属性 | 说明 |
| --- | --- | --- |
| `Icon` | `name`、`size`、`strokeWidth` | 24 网格描边图标，定义集中在 `icons.ts`，颜色继承 `currentColor`；`palette` 是色彩板轮廓加四个颜料点，颜料点填 `var(--c-accent)`，图标本身就显示当前配色 |
| `Button` | `variant`（primary／quiet／outline／plain）、`size`（sm／md）、`href`、`icon`、`iconPosition` | 有 `href` 渲染为链接，否则渲染为按钮；`data-state="busy"` 表达处理中 |
| `IconButton` | `label`（必填）、`icon`、`variant`、`size`、`type` | 只有一个图标的按钮，`label` 同时用于 `aria-label` 与 `title` |
| `Panel` | `as`、`variant`（surface／glass／soft／plain）、`padding`（none／sm／md／lg）、`lift` | 站点的基本表面：直角矩形、柔和阴影、可选半透明材质与悬停抬升 |
| `Tag` | `href`、`variant`（quiet／solid） | 标签与元信息芯片 |
| `SegmentedControl` | `name`、`legend`、`options`、`value`、`variant`（block／compact） | `role="radiogroup"` 的互斥选择，替代系统下拉框；`compact` 只显示图标，名称放进 `sr-only`，用于页头 |
| `SearchInput` | `id`、`label`、`placeholder`、`clearLabel`、`submitLabel` | 带图标、清空与提交按钮的搜索输入 |
| `Disclosure` | `id`、`summary`、`open`、`variant` | 自定义展开区域，替代 `details` |
| `Popover` | `id`、`label`、`align`、`arrows`（links／none）、`panelClass`、`trigger` 插槽 | 按钮触发的浮层，替代下拉菜单；`arrows="none"` 把方向键让给面板内的 radiogroup，并支持自定义触发器 |
| `PaletteSwatches` | `name`、`legend`、`options`、`value` | 配色色板：`role="radiogroup"`，每项带色块与名称，色块用 `--c-swatch-*` 令牌 |
| `Modal` | `id`、`labelledby`、`closeLabel`、`title`、`size`、`variant` | 自建模态层，供译文提示、图片查看与移动导航共用 |

## 交互控制器（`src/scripts/ui/`）

| 控制器 | 覆盖面 | 行为 |
| --- | --- | --- |
| `theme.ts` | 主题状态 | 唯一的模式定义与存储键来源；把 `data-theme`、`data-resolved-theme` 写到根元素；跟随系统变化；`withColorTransition()` 供明暗与配色共用 |
| `palette.ts` | 配色状态 | 读写 `<html data-palette>`，存储键 `palette`，非法值回落 `slate` 并清理；同步页面上所有色板分组 |
| `modal.ts` | 译文提示、图片查看、移动导航 | 同一时间只打开一个模态层；背景 `#page-shell` 设 `inert`；锁定滚动并在关闭后恢复滚动位置；焦点进入模态层并循环；Escape、遮罩点击、关闭按钮都能关闭；关闭后焦点回到触发元素；快速重复打开立即替换而不叠加；`resetModal()` 供软导航复位 |
| `popover.ts` | 标签筛选浮层 | 按钮触发，外部点击、Escape 关闭；方向键与 Home／End 在链接之间移动；关闭后焦点回到触发按钮；`resetPopover()` 供软导航复位 |
| `disclosure.ts` | 移动目录等折叠区域 | 只维护 `aria-expanded` 与 `data-state`，高度过渡由 CSS 完成；折叠后内容移出可访问树；`syncDisclosures()` 在每次导航后同步初始意图 |
| `segmented.ts` | 主题外观 | 点击与方向键选择，遵循 radiogroup 漫游焦点，写入 `localStorage`，并把选中态同步到页面上所有分组 |
| `header.ts` | 页头的滚动状态 | 三态 `top`／`pinned`／`hidden`：向下阅读滑出、向上滚动或聚焦滑回；写入实测 `--header-h` 供锚点补偿；`refreshHeader()` 与 `resetHeader()` 配合软导航 |

页面接线集中在 `src/scripts/interactions.ts`（控制器初始化、每页增强、代码复制、目录定位、图片查看），搜索在 `src/scripts/search.ts`，空间动效在 `src/scripts/motion.ts`。

## 与软导航配合的生命周期契约

站点使用 `<ClientRouter />`，导航时只替换文档内容，并且：

- `<html>` 的属性会被重置，因此**主题、配色与 `js` 类必须在 `astro:after-swap`（绘制前）重新写回**。这一段逻辑在 `Base.astro` 的内联脚本里，它只执行一次，但注册的监听器在整个会话有效。内联脚本无法 import，存储键、模式解析与配色白名单在 `src/scripts/ui/theme.ts`、`src/lib/palettes.ts` 各有一份等价声明，单元测试会断言两处一致。
- 相同 URL 的模块脚本整会话只执行一次，因此**页面级初始化必须放在 `astro:page-load`**：代码复制、目录观察器、图片查看、展开区域、主题控件与页头状态的同步都在这里重做。
- 文档级监听器（模态、浮层、展开区域、分段选择、页头滚动、动效）**只注册一次并使用事件委托**，页面切换后对新的 DOM 继续生效。
- `astro:before-swap` 里调用 `resetModal()`、`resetPopover()` 与 `resetHeader()`，避免 `inert`、滚动锁、浮层或页头隐藏状态泄漏到新页面。
- 站点内可能有多个同名的分段分组与色板分组（页头桌面一份、移动一份），任一处选择都要同步到全部分组。

## 页头的滚动状态

页头由 `header.ts` 维护 `data-header-state`，外观在 `SiteHeader.astro` 中用 Tailwind 的 `data-[header-state=…]` 变体给出：

- `top`：距顶 24px 以内，玻璃底、无阴影。
- `pinned`：向上滚动 ≥ 6px 或页头内有焦点，强调外观（`bg-glass-strong` + `shadow-card`）。
- `hidden`：向下滚动 ≥ 6px 且距顶超过 96px，`-translate-y-full` 滑出视口，并加 `pointer-events-none`。
- 隐藏时**不**使用 `inert` 或 `visibility: hidden`，导航与主题控件保持可聚焦，聚焦即显现。
- 控制器把页头高度写入 `--header-h`，`global.css` 的 `scroll-padding-top` 据此计算，锚点跳转不会被显现的页头遮挡。


## 细节状态

- 代码复制：按钮使用 `data-state="idle|copied|failed"`，分别显示「复制代码／已复制／复制失败，请手动选择代码」，2.5 秒后回到初始状态。
- 图片查看：上一张／下一张在两端置为禁用，说明文字显示 `替代文字 · 序号 / 总数`。
- 搜索：输入、加载、结果、无结果、失败与重试各有明确文案；清空按钮只在有输入时出现；结果复用页面内预渲染的 `<template>`，脚本只填充链接与摘要。
- 主题：`data-theme` 保存用户选择，`data-resolved-theme` 表示最终生效的主题（跟随系统时由系统决定）。

## 空间动效

| 场景 | 参数 |
| --- | --- |
| 背景分层视差 | 指针与滚动位移相加后整体不超过 16px（远层 8px、中层 16px）；触屏、减少动效、离开视口或页面切到后台时暂停并归位；正文区域不参与位移 |
| 卡片入场 | 480ms 淡入与 16px 位移，同组错峰 60ms、累计不超过 240ms；进入视口只播放一次，结束后交还样式表 |
| 卡片悬停 | 220ms、最多 6px 抬升，配合表面变化与箭头位移；键盘焦点给出同样反馈 |
| 浮层与模态层 | 打开 240ms 淡入、短位移与轻微缩放，关闭 180ms；快速重复操作有明确状态 |
| 页头隐藏／滑出 | 隐藏 260ms 加速离开、滑出 420ms 减速并轻微回弹；`translate`／`scale` 过渡可被方向变化中断；强调表面用透明度 360ms 淡入 |
| 页头首次进入 | 460ms 淡入与 10px 归位，只作用于内层内容，不与状态切换的 transform 抢属性；软导航不重播 |
| 软导航过渡 | 出场 200ms 收起、入场 340ms 淡入与 8px 位移，两段重叠衔接 |
| 主题切换 | 手动选择时给根元素加 340ms 临时过渡类（底色、文字、边框、阴影、位移），结束后移除；跟随系统与页面加载不播放 |

减少动效模式下关闭视差、错峰与空间位移，只呈现静态构图。默认 HTML 内容可见，脚本异常不会让文章停留在透明或隐藏状态。
