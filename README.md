# Hello World

一个完整的内容驱动博客：在构建阶段完成内容处理和页面生成，用浏览器交互提供搜索、主题、目录、图片查看和代码复制。

界面以 `ui.png` 为视觉基准。当前包含 12 篇中文演示文章、其中 6 篇的英文版本，以及 1 个仅供本地预览的草稿。演示文章与图片不代表作者的真实经历。

## 开始使用

需要 Node.js ≥ 22.12.0、pnpm 10.22.0。

```powershell
pnpm install --frozen-lockfile
pnpm dev
```

打开 [中文首页](http://localhost:4321/zh/) 或 [英文首页](http://localhost:4321/en/)。开发模式包含草稿；搜索需要构建后的 Pagefind 索引，请通过产物预览验收搜索。

```powershell
pnpm build
pnpm preview --port 4330
```

构建完成后打开 [静态产物预览](http://localhost:4330/zh/)。Astro 在代理环境下可能后台启动服务，可用 `pnpm exec astro preview status` 查看状态、`pnpm exec astro preview stop` 停止。

## 常用命令

| 命令 | 用途 |
| --- | --- |
| `pnpm dev` | 本地写作与草稿预览 |
| `pnpm content:check` | 内容字段、标识和本地图片校验 |
| `pnpm check` | Astro 和 TypeScript 检查 |
| `pnpm test` | 内容规则和校验边界测试 |
| `pnpm build` | 校验、静态生成、搜索索引和产物检查 |
| `pnpm preview` | 提供构建产物，不显示草稿 |
| `pnpm test:e2e` | 使用独立静态服务进行浏览器验收 |
| `pnpm verify` | 完整验收链路 |

首次运行浏览器测试前执行 `pnpm exec playwright install chromium`。测试报告位于 `playwright-report/`，截图和失败证据位于 `test-results/`，均为忽略的产物。

## 开始写作与维护

- [文档入口](docs/README.md)：各文档职责和阅读顺序。
- [内容维护](docs/content/authoring.md)：新增文章、图片、译文与草稿。
- [设计规范](docs/design/ui-ux.md)：参考图、模板和响应式体验。
- [开发约定](docs/development.md)：模块边界、命令和测试。
- [部署验收](docs/deployment.md)：Cloudflare Pages、正式 URL 和上线检查。
- [代理协作规范](AGENTS.md)：长期修改规则。

站点名称、描述和界面文案在 `src/config.ts`；关于页面在 `content/pages/`。通过 `.env` 或环境变量设置 `SITE_URL`，部署时也可以使用 Cloudflare 提供的 `CF_PAGES_URL`。默认 URL 仅用于本地开发，不代表已经发布。
