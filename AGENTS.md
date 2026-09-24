# 项目协作与实现规范

## 产品与技术基线

这是一个完整的内容驱动博客：站点界面、组件与功能以 [fuwari](https://github.com/saicaca/fuwari)（`temp/fuwari`，MIT）为源码基线，内容层保留本项目自己的双语模型。

- 技术栈：Astro 7（`output: 'static'`）+ Svelte 5（`@astrojs/svelte`）+ Tailwind CSS v4（`@tailwindcss/vite`）+ swup（`@swup/astro` 软导航）+ Stylus（设计变量与 Markdown 扩展样式）+ Pagefind（搜索）+ astro-expressive-code / katex / photoswipe / astro-icon。
- 依赖取本环境可用的最新版本；TypeScript 固定在 6.x，因为 `@astrojs/check` 与 `@astrojs/svelte` 的 peer 范围不包含 7.x。
- 代码写法跟随 fuwari（Tab 缩进、双引号、英文注释、Biome 格式化）。项目文档与面向作者的说明保持中文。
- 不引入 React / Vue、通用 UI 组件库、CMS、数据库或服务端运行时；评论、点赞、账号不在范围内。

## 目录与职责

- `content/posts/<id>/<zh|en>.md`：文章内容；同一目录的语言文件属于同一内容，图片与文章共同维护。
- `content/pages/about-*.md`：关于页 Markdown。
- `src/content.config.ts`：内容集合 schema；`src/lib/rules.ts`：共享构建规则；`src/lib/posts.ts`：把内容集合适配成界面消费的形状。
- `src/config.ts`：品牌、站点文案（`siteText`）、分类名（`kindLabels`）、导航、作者与许可协议。
- `src/components/`、`src/layouts/`：fuwari 的界面组件；`src/pages/`：路由（中文在根路径，英文在 `en/`）。
- `src/utils/`：locale、url、日期、设置与内容查询工具；`src/i18n/`：界面词典（本站只启用 `zh_CN` 与 `en`）。
- `src/styles/`：`main.css` 聚合入口、`theme.css`（Tailwind 入口与语义工具类）、其余样式文件各自用 `@reference` 声明依赖。
- `scripts/`：内容与产物校验、新建内容；`tests/`：单元测试与真实浏览器验收；`docs/`：内容、部署、决策与验收证据。

## 语言与内容不变量

- 中文是默认语言，直接占用根路径（`/`、`/posts/<id>/`）；英文统一在 `/en/` 下（`/en/`、`/en/posts/<id>/`）。不生成 `/zh/` 页面，旧链接由 `public/_redirects` 301 到根路径。
- 语言由路由决定，界面文案必须显式传入 `locale`：`i18n(key, locale)`、`getPostUrl(locale, slug)`。禁止用模块级可变状态或 `siteConfig.lang` 推断当前语言，否则中英页面会互相污染。
- 每篇内容有标题、发布日期、类型、展示形式和至少一个标签；日期使用 UTC 日历日期。
- 手写摘要优先，否则从正文提取最多 160 字符；封面优先使用 `cover`，否则取正文首图，都没有时使用无图卡片。
- 草稿只在 `pnpm dev` 可见：生产构建在内容 loader 层排除草稿，草稿与草稿私有图片不得进入 `dist`、Pagefind 索引、RSS 或 Sitemap。
- 译文可选；文章页在有译文时给出译文链接，没有译文时不伪造译文页。
- 一页 10 条，分页使用真实静态链接（`/2/`、`/en/2/`）；置顶（`pinnedOrder`）优先于日期倒序。
- 分类由 `kind` 映射（文章／日记／学习笔记），桌面侧栏与归档筛选复用 fuwari 的 `Categories` / `Tags` / `ArchivePanel`。

## 界面与工程约束

- 界面行为以 fuwari 为准：侧栏 Profile／Categories／Tags、导航栏搜索与主题设置、文章目录、代码块、图片灯箱、归档面板、返回顶部。
- 站内导航由 swup 接管（`Layout.astro` 中的 swup hooks）。新增浏览器脚本必须考虑软导航：在 swup 的 `page:view` / `content:replace` 钩子里重新初始化，不能只依赖首次加载。
- `client:only="svelte"` 组件在挂载前不可交互；涉及它们的交互与测试都要先等待元素出现再操作。
- **岛屿组件的 props 必须是最小可序列化纯数据**（字符串、数字、字符串数组）。不要直接传内容集合条目：`Date`、图片元数据、`undefined` 都会让 `client:only` 的 props 反序列化失败，界面在开发环境直接空白。归档面板就是通过 `ArchiveView.astro` 里的映射规避这个问题的。
- 封面字段统一走 `src/lib/rules.ts` 的 `normalizeCover`：位图是 Astro 的 `ImageMetadata`，**SVG 是可渲染的组件工厂**（工厂上挂 `src`），开发环境下虚拟模块还可能返回相对 URL。任何绕过它的封面读取都会在某个环境下静默丢失封面。
- Tailwind v4 的 `@apply` 不接受 important 修饰符，需要覆盖时写原生 CSS。每个被 `@import` 的样式文件都要用 `@reference` 声明依赖（Vite 会把它当作独立编译单元）。
- 颜色与暗色模式走语义变量：`theme.css` 的 `@theme` / `@utility` 与 `variables.styl` 的 `--*` 令牌，暗色依赖 `html.dark` 与 `@custom-variant dark`。
- 内容协议变化时同步 schema、`scripts/check-content.ts`、`docs/content/authoring.md` 与边界测试。

## 变更与验证

1. 修改前检查工作区，保留用户文件与未提交更改。
2. 本机 `pnpm` 若因 `packageManager` 固定版本报错，使用 `npx --yes pnpm@10.22.0 <命令>` 执行同样的脚本。
3. 运行 `pnpm check`（astro check）、`pnpm test`（Vitest）、`pnpm build`（内容校验 + 构建 + Pagefind + 产物检查）、`pnpm test:e2e`（Playwright，4329 端口与构建产物）；一键入口为 `pnpm verify`。
4. E2E 使用构建产物，不复用开发服务器；开发服务器包含草稿，不能作为发布验收依据。
5. UI 变化检查桌面、平板、手机与深色主题，并把截图保存到 `docs/evidence/`，不用编译成功代替视觉验收。
6. 交付时区分本地实现、验证结果与外部部署状态；未获当前授权不自行提交、推送或部署。
7. 重要决策写入 `docs/decisions/`，实现变化时同步相关文档，避免同一规则分散在多处。

## 文档维护

先读 `docs/README.md` 找到权威来源：内容格式以 `docs/content/authoring.md` 与 `src/content.config.ts` 为准，界面基线来自 fuwari，部署以 `docs/deployment.md` 为准，协作行为以本文件为准。
