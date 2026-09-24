# ADR-0004：以 fuwari 为源码基线重构站点，内容层保留本项目双语模型

状态：已采用（2026-09-25）。用户指示「把 temp 下的项目直接复制到当前项目，除了代码风格，其他全部复制」，并确认：整体搬入 fuwari 源码、依赖用最新版本、内容与语言沿用现有 zh/en 模型且默认中文不带 `/zh` 路由、旧资产不备份直接覆盖。

## 背景

前一版站点是自建的 Astro 实现：自建 UI 组件与交互控制器、五套配色、双行页头与分类停靠区、`/[locale]/[taxonomy]/` 标签路由，界面语言与主题由 `src/styles/global.css` 的令牌体系驱动。它在 25 轮迭代后已经能通过完整验收，但视觉与交互细节仍需要不断手工逼近参考主题 `fuwari`。

`temp/fuwari` 是完整可用的主题源码（Astro 5 + Svelte 5 + swup + Tailwind 3 + Stylus + Pagefind + expressive-code）。继续在自建实现上「参考」它，等于持续维护两套并行实现。

## 决策

1. **源码基线**：把 fuwari 的界面、组件、插件、样式与页面结构整体搬入仓库作为唯一实现；自建 UI 组件、脚本、旧路由、旧文档与旧测试删除，不再保留第二套实现。
2. **技术栈取最新**：Astro 7、Svelte 5、Tailwind CSS v4（`@tailwindcss/vite`）、swup 1.8、expressive-code 0.44、Pagefind 1.5、astro-icon 1.2；TypeScript 固定 6.x（`@astrojs/check` 与 `@astrojs/svelte` 的 peer 不含 7.x）。
3. **内容层保留**：`content/posts/<id>/<zh|en>.md`、`content/pages/`、现有 schema 与 12 篇演示内容（含 1 篇草稿）不变；新增 `src/lib/posts.ts` 把集合适配成 fuwari 组件消费的数据形状（`published` ← `publishedAt`、`description` ← `summary`/正文摘要、`image` ← `cover`/首图、`category` ← `kind` 本地化标签、`lang` ← 路由语言）。
4. **语言路由**：`i18n.routing.prefixDefaultLocale: false`，中文占根路径、英文在 `/en/`；路由按语言镜像（`src/pages/en/**`），界面文案显式传入 `locale`；`public/_redirects` 把 `/zh/*` 301 到根路径。
5. **草稿规则不变**：仍在内容 loader 层排除，草稿与草稿私有图片不会进入产物、搜索索引、RSS 与 Sitemap。
6. **文档与验证重建**：`AGENTS.md` 改写为新基线，旧设计文档、ADR-0001~0003、验收记录与旧截图删除，新增 ADR-0004、内容维护指南、部署说明与新的截图证据。

## 后果

- 站点的界面语言、间距、组件层级由 fuwari 决定；本项目的产品偏好（每页 10 条、置顶优先、双语、草稿隔离）通过适配层与配置保留。
- 旧的标签／类型静态路由（`/tags/…`、`/types/…`）被移除，分类与标签浏览改由侧栏组件与归档页的客户端筛选承担；旧的 `/zh/` 链接通过 301 兼容。
- 五套配色、双行页头与分类停靠区等自建能力不再存在；暗色模式与主题色相改由 fuwari 的主题设置面板提供。
- 样式层从 Tailwind 3 + PostCSS 迁到 Tailwind v4 的 CSS-first 配置：`src/styles/theme.css` 是引擎入口（`@import "tailwindcss"` + `@plugin` + `@custom-variant dark` + `@theme` + `@utility`），`src/styles/main.css` 只做聚合，其余样式文件各自 `@reference`（Vite 把每个 `@import` 的 CSS 当作独立编译单元）。
- fuwari 的 `src/styles/*` 在上游没有被任何文件 import，样式入口由本仓库显式接线：`Layout.astro` 引入 `main.css`，设计变量与 Markdown 扩展样式仍以 Stylus 全局样式块加载。
- 验收链路改为 `pnpm check` + `pnpm test` + `pnpm build` + `pnpm test:e2e`，测试与截图证据全部重写以匹配新界面。
