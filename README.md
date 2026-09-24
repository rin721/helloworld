# Hello World

一个内容驱动的双语博客：界面、组件与交互基于 [fuwari](https://github.com/saicaca/fuwari) 重写，内容使用本项目自己的 `content/posts/<id>/<zh|en>.md` 双语模型。构建阶段完成内容解析与页面生成，浏览器只负责搜索、主题、目录、图片查看与代码块等交互。

中文是默认语言并直接使用根路径（`/`），英文在 `/en/` 下；旧的 `/zh/…` 链接由 `public/_redirects` 301 到根路径。

当前包含 12 篇中文演示内容、其中 6 篇的英文版本，以及 1 篇仅供本地预览的草稿。演示文章与图片不代表作者的真实经历。

## 开始使用

需要 Node.js ≥ 22.12.0、pnpm 10.22.0。

```powershell
pnpm install --frozen-lockfile
pnpm dev
```

打开 [中文首页](http://localhost:4321/) 或 [英文首页](http://localhost:4321/en/)。开发模式包含草稿；搜索依赖构建后的 Pagefind 索引，请在产物预览下验收搜索。

```powershell
pnpm build
pnpm preview --port 4330
```

构建完成后打开 [静态产物预览](http://localhost:4330/)。Astro 在代理环境下可能后台启动服务，可用 `pnpm exec astro preview status` 查看状态、`pnpm exec astro preview stop` 停止。

如果本机 `pnpm` 因 `packageManager` 固定版本报错（例如全局 pnpm 版本较新），用 `npx --yes pnpm@10.22.0 <同样的命令>` 执行。

## 常用命令

| 命令 | 用途 |
| --- | --- |
| `pnpm dev` | 本地写作与草稿预览 |
| `pnpm content:check` | 内容字段、标识和本地图片校验 |
| `pnpm check` | Astro 与 TypeScript 检查 |
| `pnpm test` | 内容规则、路径与内容协议的单元测试 |
| `pnpm build` | 校验、静态生成、搜索索引和产物检查 |
| `pnpm preview` | 提供构建产物，不显示草稿 |
| `pnpm test:e2e` | 使用独立静态服务进行浏览器验收并输出截图证据 |
| `pnpm lint` / `pnpm format` | Biome 检查与格式化 |
| `pnpm new-post <id>` | 新建 `content/posts/<id>/{zh,en}.md` 草稿 |
| `pnpm verify` | 完整验收链路 |

首次运行浏览器测试前执行 `pnpm exec playwright install chromium`。测试报告位于 `playwright-report/`，失败证据位于 `test-results/`，均为忽略的产物。

## 文档入口

- [文档索引](docs/README.md)：各文档职责和阅读顺序。
- [内容维护](docs/content/authoring.md)：新增文章、图片、译文与草稿。
- [部署与验收](docs/deployment.md)：Cloudflare Pages 配置与上线检查。
- [决策记录](docs/decisions/0004-fuwari-based-rebuild.md)：为什么以 fuwari 为源码基线。
- [视觉证据](docs/evidence/README.md)：桌面、平板、手机与深色主题截图。
- [协作规范](AGENTS.md)：长期修改规则。

站点名称、描述和界面文案在 `src/config.ts`；关于页面在 `content/pages/`。通过 `.env` 或环境变量设置 `SITE_URL`，部署时也可以使用 Cloudflare 提供的 `CF_PAGES_URL`。

## 许可与致谢

界面与组件源自 [fuwari](https://github.com/saicaca/fuwari)（MIT，见 `LICENSE`），本项目在其基线之上替换了内容层与双语路由。
