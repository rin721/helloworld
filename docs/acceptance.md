# 首版实施验收

验收日期：2026-09-23。范围为本地可运行应用、生产静态产物及维护文档；不包含真实域名绑定或线上发布。

## 环境与结果

### 卡片语言验收（圆角、无阴影）

按用户指示改用 fuwari 式卡片语言：圆角、**全站无阴影**，层次靠卡片与页面底色的明度阶梯表达。决定与后果见 [ADR-0002](decisions/0002-rounded-no-shadow-card-language.md)，规则见 [UI/UX 规范的卡片语言](design/ui-ux.md#卡片语言)。

| 检查 | 方式与结果 |
| --- | --- |
| 全站无阴影 | 对内容卡片、首页背景面板、页头吸附层、卡片箭头、归档月卡、类型／标签卡、搜索输入逐个断言 `box-shadow: none`；浮层与模态同样无阴影，但有 1px 边界。产物 CSS 层面断言不存在任何非 `none` 的 `box-shadow` 声明（只扫描应用自身 CSS，Pagefind 自带界面样式不计） |
| 圆角刻度 | 卡片与面板 16px、卡片封面容器 16px、圆形按钮与控件 8px、标签芯片 6px，直接断言计算样式 |
| 焦点不被裁切 | 断言卡片根 `overflow: visible`、封面容器 `overflow: hidden`；对整卡为链接的类型／标签卡聚焦后断言轮廓宽度非 0 且元素矩形完全落在卡片矩形内 |
| 明度阶梯 | 五份配色 × 浅色／深色共 10 组，在归档页截图后采样「页面底色」与「卡片内部」像素，断言卡片明度（L*）高出至少 4（实测 4.8–8.4） |
| 悬停与焦点一致 | 悬停卡片后断言底色变化、标题颜色等于 `--c-accent`、封面 `scale` 非 none；改用键盘聚焦卡片内链接后三项反馈完全相同 |
| 对比度未退化 | 底色压深后 `--c-muted` 微调为 `#536880`，五份配色 × 两种明暗的对比度矩阵继续全部通过 |
| 装饰裁切方式 | 带几何切片的卡片改为「装饰内层元素 `absolute inset-0 overflow-hidden rounded-card`」承载裁切，卡片根不再裁切；产物校验替换为「必须产出圆角工具类」与「不得有 box-shadow」 |

本轮 `pnpm verify` 全部通过：类型检查无错误，22 项单元测试、52 项浏览器测试及 57 个 HTML 产物检查通过。截图与录屏已按新的卡片语言整体重拍（首页、详情、归档、类型／标签、搜索、关于、404、深色、五份配色与页头状态）。

### 配色系统验收

在明暗外观之外新增正交的配色轴 `<html data-palette>`，提供蓝灰（默认）、青绿、紫罗兰、暖橙、石墨五份配色，页头改为「外观与配色」设置浮层。规则与对比度门槛见 [UI/UX 规范的配色](design/ui-ux.md#配色主题色)。

| 检查 | 方式与结果 |
| --- | --- |
| 切换生效与持久 | 切到青绿后 `data-palette="jade"`，`--c-accent` 与 `--backdrop-mid-1` 都随之改变；刷新后保持 |
| 软导航写回 | 注册 `astro:after-swap` 监听器记录当时取值，导航后断言记录为 `['jade']`，即绘制前已写回、不会闪回默认配色 |
| 非法取值 | 写入未知配色名后刷新，回落 `data-palette="slate"` 并清理存储键 |
| 对比度矩阵 | 5 份配色 × 浅色／深色共 10 组，用探针元素把变量解析成 `rgb()` 后断言：`--c-ink`/底色 ≥ 7:1、`--c-muted`/底色 ≥ 4.5:1、`--c-faint`/表面 ≥ 3:1、`--c-on-accent`/强调色 ≥ 4.5:1、强调色/浅色面 ≥ 3:1、强调色/底色 ≥ 3:1 |
| 默认配色无回归 | 断言浅色 `--c-canvas` = `#eef3f8`、`--c-accent` = `#476282`，深色 `#101a24` / `#b2c9e1`，与引入配色轴之前逐字节一致 |
| 设置浮层可达性 | 浮层内同时有外观分段与 5 项色板；方向键 / Home / End 可切换配色并同步根元素；Escape 关闭并把焦点送回触发按钮；外部点击关闭 |
| 过渡与减少动效 | 切换时出现临时过渡类并在约 340ms 后移除；`reducedMotion: reduce` 下不添加该类，配色仍然切换 |
| 产物检查 | 断言产物含 5 项色板选项、四份非默认配色的 CSS 变量块与 `--c-on-backdrop` 令牌 |
| 色彩板图标 | 设置入口使用色彩板图标（画板轮廓 + 四个颜料点），断言图标内 4 个颜料点填 `var(--c-accent)`，并对按钮截图统计强调色像素：默认蓝灰与切到青绿后都能命中，说明图标颜料点跟随当前配色 |

本轮 `pnpm verify` 全部通过：类型检查无错误，22 项单元测试、48 项浏览器测试及 57 个 HTML 产物检查通过。

证据：五份配色 × 浅色／深色首页首屏 `docs/evidence/palette/palette-<key>-<light|dark>.png`（共 10 张）、设置浮层 [桌面](evidence/palette/settings-popover.png) 与 [手机](evidence/palette/settings-popover-mobile.png)、配色切换 [录屏](evidence/palette/palette-switch.webm)。

### 内页背景清理验收

已删除 `Backdrop` 的 `page` / `minimal` 装饰子节点，归档、关于、详情、类型、标签、分页、搜索和 404 仅保留主题底色。首页构图和归档语义时间轴保留。已打开复核桌面、平板、手机、深色归档及关于页截图。

清理后重跑完整 `pnpm verify` 全部通过：类型检查无错误，22 项单元测试、48 项浏览器测试及 57 个 HTML 产物检查通过。此前一轮记录的全量失败（预览端口连接中断、主题单选控件定位超时与 trace 缺失）本轮没有复现，明细与截图见 [内页背景清理记录](evidence/inner-background/README.md)。

### 页头滚动动效验收

页头不再常驻固定顶部，改为滚动驱动的三态导航，规则见 [UI/UX 规范的页头滚动行为](design/ui-ux.md#页头的滚动行为)。检查方式与结果：

| 检查 | 方式与结果 |
| --- | --- |
| 三态切换 | 顶部为 `top`（`rect.top = 0`、强调层透明度 < 0.05）；向下滚 900px 后为 `hidden` 且页头底边 ≤ 0（完全滑出视口）；向上滚 80px 后为 `pinned`、`rect.top = 0`、强调层透明度 > 0.95 且该层有阴影；回到顶部恢复 `top` 且强调层淡出 |
| 动效连续性 | 以约 24ms 间隔采样页头在视口中的位置：隐藏与滑出都必须出现多个严格位于起点与终点之间的中间值（不是一次跳到位）；滑出在贴顶时最大过冲 > 0.3px 后稳定回 0，避免“硬着陆” |
| 非对称节奏 | 断言滑出方向过渡时长为 0.42s、隐藏方向为 0.26s，出快进慢 |
| 主题过渡 | 手动选择主题后根元素带临时过渡类 `theme-anim`，约 340ms 后自动移除；减少动效模式下不添加该类 |
| 无布局跳动 | 隐藏前后断言列表容器的文档偏移完全相同，页头隐藏不改变文档流 |
| 键盘可达 | 页头隐藏时对页头内第一个链接调用 `focus()`，状态立即变为 `pinned` 并回到视口内（隐藏不使用 `inert`／`visibility: hidden`） |
| 减少动效 | `reducedMotion: 'reduce'` 下状态仍然切换，但页头计算样式的 `transition-duration` 为 `0s` |
| 软导航复位 | 隐藏状态下从内容区软导航到详情页，新页面状态为 `top`、`--header-h` 已写入，且隐藏与显现继续工作 |
| 锚点补偿 | 先跳到靠后的章节再回到第一个标题（向上滚动会显现页头），断言标题上边界不低于页头下边界 |
| 页头适配 | 390/480/600/768/1000/1440 下页头内容宽度均小于容器宽度，无换行与横向溢出 |

本轮 `pnpm verify` 全部通过：类型检查无错误，21 项单元测试、41 项浏览器测试及 57 个 HTML 产物检查通过。

六种状态各有静态截图与动画录屏（一一对应）：

| 场景 | 截图 | 动效 |
| --- | --- | --- |
| 贴顶 | [png](evidence/header-scroll/header-scroll-top.png) | [webm](evidence/header-scroll/header-scroll-top.webm) |
| 向下阅读隐藏 | [png](evidence/header-scroll/header-scroll-hidden.png) | [webm](evidence/header-scroll/header-scroll-hidden.webm) |
| 向上滚动滑出 | [png](evidence/header-scroll/header-scroll-pinned.png) | [webm](evidence/header-scroll/header-scroll-pinned.webm) |
| 手机贴顶 | [png](evidence/header-scroll/header-scroll-mobile-top.png) | [webm](evidence/header-scroll/header-scroll-mobile-top.webm) |
| 手机隐藏 | [png](evidence/header-scroll/header-scroll-mobile-hidden.png) | [webm](evidence/header-scroll/header-scroll-mobile-hidden.webm) |
| 深色滑出 | [png](evidence/header-scroll/header-scroll-dark-pinned.png) | [webm](evidence/header-scroll/header-scroll-dark-pinned.webm) |

综合动效录屏见 [ui-motion.webm](evidence/ui-motion.webm)（背景视差、卡片悬停、浮层、模态层、页头滚动与软导航）。

### 归档时间轴验收

按用户提供的参考图新增纵向虚线、分组空心圆和文章节点。保留现有月份分组，日期列和文章列分别位于轴线两侧；多行文章不会打断轴线，末条节点处收束。时间轴为装饰性时间顺序提示，使用 `aria-hidden`，不增加键盘停靠点。

本轮 `pnpm verify` 全部通过：类型检查无错误，21 项单元测试、32 项浏览器测试及 57 个 HTML 产物检查通过。另以 Chromium 检查中文 12 条和英文 6 条归档的节点数、轴线段数和页面宽度，均无水平溢出；实际打开复核桌面、平板、手机、深色截图。

截图：[桌面](evidence/archive-timeline/desktop.png)、[平板](evidence/archive-timeline/tablet.png)、[手机](evidence/archive-timeline/mobile.png)、[深色](evidence/archive-timeline/dark.png)、[英文](evidence/archive-timeline/english.png)。

### 完整应用验证

Windows 本地使用 Node.js 24.11.1、pnpm 10.22.0、Astro 7.3.3。依赖由 `pnpm-lock.yaml` 固定，浏览器验收使用 Playwright Chromium。

| 验证 | 实际结果 |
| --- | --- |
| `pnpm check` | 0 个错误、0 个警告、0 个提示 |
| `pnpm test` | 21 项内容、规则、UI 约定与脚本生命周期测试通过 |
| `pnpm build` | 内容校验、Astro 静态构建、Pagefind 索引、产物校验通过 |
| `pnpm test:e2e` | 52 项真实浏览器测试通过 |
| `pnpm verify` | 卡片语言改为圆角无阴影后完整流水线通过，22 项单元测试及 52 项浏览器测试通过 |
| 公开内容 | 12 个中文版本、6 个英文版本；另有 1 篇仅开发预览可见的中文草稿 |
| 静态输出 | 57 个 HTML 页面；Pagefind 按语言索引 18 篇正文；构建生成 11 张优化 WebP 图片 |
| 草稿开发预览 | 本地开发服务直接访问草稿路径返回 200，能读取专用标记 |

## 验证覆盖

本轮重构残留清理已完成：删除内容容器短线与描边、修复标签回退入口层级、搜索重复初始化与默认控件样式，并恢复代码双主题配色。扫描全部页面与公共组件，实际打开检查关于页、文章页、首页、归档、标签及搜索浮层截图；关于页另检查桌面／平板／手机与深色状态。原因、修复边界和本轮截图见 [清理记录](evidence/style-cleanup/README.md)。

- 内容：手写和自动摘要、正文首图回退、置顶排序、分页边界、单项筛选、译文关联、无效日期和元数据、无效本地图片、纯图片内容。
- 页面：真实静态链接、详情与分页直接访问、类型和标签索引、归档、关于、404、中英文页面，以及禁用 JavaScript 后的浏览阅读。
- 交互：中英文搜索真实命中、无结果、索引加载失败与重试、译文跳转和缺失提示、主题持久化及系统跟随、代码复制、目录定位、键盘图片查看和焦点返回、移动导航。
- 产物：内部链接和图片引用、正文锚点、页面标题结构、canonical、语言标记、JSON-LD、RSS 数量、Sitemap 和搜索资源。开发服务与 E2E 的产物服务使用独立端口，避免把开发草稿或未构建搜索误作生产行为。
- 草稿隔离：草稿页面和专用图片均带 `DRAFT_ONLY_SENTINEL` 标记。生产集合在 Markdown 解析之前排除草稿，图片依赖仅导入公开文章引用；检查部署 HTML、路径和文本资产没有标记，也没有草稿专用 SVG。公开 RSS、Sitemap、搜索均排除草稿。

## 背景重设计验收

首页背景已按「错位叠放的矩形面板」重做，规则见 [UI/UX 规范的背景层次](design/ui-ux.md#背景层次)。本节记录实现侧的检查方式与实际结果。

| 检查 | 方式与结果 |
| --- | --- |
| 旧结构移除 | 断言产物中的 `.architecture`、`.plane`、`.light-plane`、`.floor-plane` 数量为 0；立柱色块、斜向光束与地面分界的 CSS 已删除 |
| 层次数量 | 桌面与平板为远层 2 + 中层 3 + 底板 1 共 6 层；手机保留远层 1 + 中层 1 + 底板 |
| 遮挡关系 | 桌面与平板每对相邻中层面板的重叠面积均大于 2000 px²，且最左中层面板位于首屏宽度的 60% 之后 |
| 文字区域平静 | 用文字行盒（`Range.getClientRects`）而非元素盒子断言桌面、平板、手机三种宽度下中层面板与文字零重叠；像素采样进一步断言标题下方与说明文字下方的带状区域亮度差小于 12/255（实测约 2.5/255） |
| 层次可辨认 | 相邻面板中心的相对亮度差大于 0.005（实测中层与远层约 0.03）；首屏右侧区域的亮度标准差大于 4（实测约 10），不是一整块平色 |
| 标题可读性 | 标题颜色与面板实测底色的对比度大于 7:1 |
| 精选底板 | 桌面、平板、手机均断言底板在精选卡片的右侧与上侧各露出至少 12px，下侧超出卡片 |
| 视差与入场 | 远层位移不超过 8px、中层不超过 16px（整体上限 16px），前景面板与正文区域变换为 `none`，快速连续移动后仍在限额内，指针离开后回到静止位置；播放结束后没有仍在运行的动画 |
| 减少动效 | `prefers-reduced-motion: reduce` 下面板动画名为 `none`、透明度为 1，直接呈现静态构图 |
| 深色模式 | 断言背景容器没有 `filter`，底色与各层面板颜色和浅色不同且各层颜色互不相同，投影仍然存在 |
| 内页与简化变体 | 内页背景为 `fixed` 且与 `.article-grid` 重叠面积为 0，页面空白处的实测像素与页面底色不同，确认固定背景层确实绘制在底色之上；搜索页使用 `minimal` 变体；分页列表使用 `page` 变体且没有首屏背景 |
| 手机适配 | 390px 下只保留两块背景面板与底板，指针移动后所有背景层都没有位移，页面无横向溢出 |
| 无脚本降级 | 禁用 JavaScript 后背景容器、五个面板与入场结束状态仍然完整可见 |

## 组件化重构验收

全站按 [UI 组件与交互机制](design/components.md) 重建视觉与交互，规则见 [UI/UX 规范](design/ui-ux.md)。本节记录实现侧检查方式与结果。

| 检查 | 方式与结果 |
| --- | --- |
| 设计变量 | 断言产出的 CSS 含 `.bg-surface`、`.page-width`、`.shadow-card` 等语义工具类，颜色与阴影来自 `@theme inline` 映射的变量，浅色与深色共用同一组名称 |
| 移除旧样式 | 产物断言不再包含 `.entry-card`、`.filter-bar`、`.tag-menu`、`.about-art`、`.search-field`、`.type-filters`、`.primary-link`、`.hero-panel` 的样式规则；全局 CSS 只保留主题、基础样式、Markdown 排版、几何绘制与关键帧 |
| Tailwind 优先 | 对首页、归档、搜索、关于四个页面统计带布局工具类的元素数量，低于 20 判定失败 |
| 不使用系统控件 | 源码与产物都断言没有 `<select>`、`<details>`、`<summary>`、`<dialog>`、`showModal(` 与 `window.alert/confirm/prompt(`；页面改为 `SegmentedControl`、`Disclosure`、`Popover` 与 `Modal` |
| 模态层行为 | 断言打开后背景 `#page-shell` 带 `inert`、`body` 带 `data-scroll-locked`、焦点进入模态层、连续 Tab 始终留在模态层内、Escape 关闭后焦点回到触发元素并恢复滚动位置；同一时间只有一个 `[data-modal]:not([hidden])` |
| 快速重复操作 | 连续三次打开与 Escape 关闭后，模态层确实关闭、背景恢复可操作，再打开仍然正常 |
| 浮层行为 | 断言按钮触发、`aria-expanded` 与 `aria-haspopup`、方向键进入链接列表、外部点击关闭、Escape 关闭并返回焦点 |
| 移动目录 | 桌面显示侧栏目录且不显示折叠块；手机上折叠块关闭时高度收敛到 0、展开后大于 60px，`aria-expanded` 与 `data-state` 同步 |
| 主题控件 | 分段选择的点击与键盘选择都会写入持久化偏好，页面刷新后保持，并继续跟随系统变化 |
| 禁用 JavaScript | 导航、分类与标签链接、分页、正文与目录仍然可用；背景层次完整可见；脚本专属控件不显示 |

## 软导航与主题集成验收

站内链接改为 `<ClientRouter />` 软导航，主题设置移到页头。规则见 [UI/UX 规范的软导航与主题](design/ui-ux.md#软导航与主题)，生命周期契约见 [UI 组件与交互机制](design/components.md#与软导航配合的生命周期契约)。

| 检查 | 方式与结果 |
| --- | --- |
| 不整页刷新 | 在 `window` 上写标记后点击站内链接，导航完成后标记仍在；后退同样保持标记，说明两次都是软导航 |
| 地址与内容 | 点击后 URL、标题与新页面内容都更新；页面根元素带 `data-navigation="soft"` |
| 主题在绘制前应用 | 测试注册 `astro:after-swap` 监听器记录当时的根属性，导航后断言该记录为 `['dark','dark',true]`，即 `data-theme`、`data-resolved-theme` 与 `js` 类在交换完成时已正确 |
| 主题保持 | 软导航后根属性与页头控件选中态一致，`body` 背景为深色变量值；切回浅色后再次导航仍然保持 |
| 交互不重复绑定 | 首页→归档→首页→类型列表→详情多次软导航后，代码复制按钮数量为 1，目录定位、主题控件、标签浮层、模态层都仍然工作 |
| 搜索页重复访问 | 离开搜索页再回来，检索仍然返回结果并更新状态文案（搜索脚本整会话只执行一次，接线由 `astro:page-load` 负责） |
| 模态层与导航 | 打开移动导航后点击其中链接跳转，新页面 `#page-shell` 无 `inert`、`body` 无滚动锁、没有残留模态层，且新页面上模态层可以正常打开 |
| 非 HTML 目标 | 产物断言所有 `.xml` 链接都带 `data-astro-reload`，RSS 由浏览器整页处理 |
| 页头适配 | 390/480/600/768/1000/1440 下页头内容宽度均小于容器宽度，无换行与横向溢出 |

## 视觉证据

以下是构建产物在 Chromium 中的实际截图，参考图为仓库根目录 [ui.png](../ui.png)。截图时禁用动画并等待字体，避免截取主题过渡的中间状态。

| 场景 | 截图 |
| --- | --- |
| 桌面首页，1440 px | [首屏](evidence/home-desktop.png) |
| 手机首页，390 px | [完整页面](evidence/home-mobile.png) |
| 平板首页，768 px | [完整页面](evidence/home-tablet.png) |
| 桌面深色主题，1440 px | [首屏](evidence/home-dark.png) |
| 英文首页，1440 px | [完整页面](evidence/home-en.png) |
| 学习笔记，桌面与手机 | [桌面](evidence/note-desktop.png)、[手机](evidence/note-mobile.png) |
| 背景层次，桌面／平板／手机 | [桌面](evidence/backdrop-desktop.png)、[平板](evidence/backdrop-tablet.png)、[手机](evidence/backdrop-mobile.png) |
| 背景层次，深色与内页 | [深色](evidence/backdrop-dark.png)、[内页](evidence/backdrop-page.png) |
| 组件与页面，1440 px | [归档](evidence/page-archive.png)、[类型与标签索引](evidence/page-taxonomy.png)、[搜索与结果](evidence/page-search.png)、[详情](evidence/page-article.png)、[关于](evidence/page-about.png)、[404](evidence/page-404.png) |
| 自建交互层 | [标签浮层](evidence/overlay-popover.png)、[译文提示模态层](evidence/overlay-translation.png)、[图片查看](evidence/overlay-lightbox.png)、[移动导航](evidence/overlay-mobilenav.png) |
| 深色主题页面 | [归档](evidence/dark-archive.png)、[搜索](evidence/dark-search.png)、[详情](evidence/dark-article.png) |
| 页头与主题设置 | [桌面](evidence/header-theme.png)、[深色](evidence/header-theme-dark.png)、[手机](evidence/header-theme-mobile.png) |
| 空间动效、交互反馈与软导航录屏 | [录屏](evidence/ui-motion.webm) |

此前背景重构主要通过几何断言、像素采样、对比度计算与 DOM 状态断言检查并保存截图。样式残留清理与内页背景清理两轮已实际打开复核上述受影响页面，最新证据以 style-cleanup 与 inner-background 目录为准；其他截图保留为前次实施记录。用户的最终视觉确认仍单独记录。

## 交付边界

本地实现和构建验收已完成。首版实现提交为 `16ae573`，本轮前台视觉体系迭代（背景重设计、组件化重构、软导航接入、页头滚动、配色系统与内页背景清理）提交为 `d1d9187`，均已推送到 GitHub `main`；GitHub Actions 工作流「Blog quality」在 Node.js 24 与 pnpm 10.22.0 下执行 `pnpm verify` 成功（首版 Run 35760538041、本轮 Run 35865294608）。Cloudflare Pages 的配置步骤已写入 [部署指南](deployment.md)，尚未绑定项目、真实域名或执行线上发布。本地验证结论与远端 CI 分别记录，不用其一替代另一项。

当前名称为 Hello World，文章和图片明确标注为演示内容，作者介绍没有虚构个人履历。正式发布前按 [内容维护指南](content/authoring.md) 替换内容，在 `src/config.ts` 更新站点信息，并设置真实 `SITE_URL` 后重新运行 `pnpm verify`。

Pagefind 构建会提示根路径重定向页面不被索引，以及中文词干支持的限制；中英文正文索引及实际查询已通过验证。未开展跨浏览器矩阵、Lighthouse 或线上监控验收，不将其视为已完成。
