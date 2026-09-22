# Cloudflare Pages 部署与验收

## 构建边界

部署产物是 `dist/` 中的静态页面、样式、浏览器脚本、优化图片和 Pagefind 索引。Node.js 只在构建和本地工具中使用，生产站点不需要 Node 服务或 Pages Functions。

## Git 集成配置

在 Cloudflare Pages 连接当前 GitHub 仓库：

| 设置 | 值 |
| --- | --- |
| 生产分支 | `main` |
| 根目录 | 仓库根目录 |
| 构建命令 | `pnpm check && pnpm test && pnpm build` |
| 输出目录 | `dist` |
| `NODE_VERSION` | `24.11.1` |
| `PNPM_VERSION` | `10.22.0` |
| `SITE_URL` | 正式 HTTPS 域名，包含协议 |

URL 优先级为 `SITE_URL` → `CF_PAGES_URL` → `http://localhost:4321`。本地可通过 `.env` 配置；设置自定义域名后必须更新 `SITE_URL` 并重新构建，以更新 canonical、RSS 和 Sitemap。预览环境可不设置生产 `SITE_URL`，使用对应的 `CF_PAGES_URL`。

GitHub Actions 负责完整检查和 Playwright 验收；Pages 构建也独立进行内容、类型和单元检查。若要让 E2E 失败阻止生产分支合入，需要在仓库分支保护中将 CI 配置为必需检查；本地代码不会自动修改远端规则。

参考：[Astro 的 Pages 部署说明](https://developers.cloudflare.com/pages/framework-guides/deploy-an-astro-site/)。

## 本地验收

```powershell
pnpm install --frozen-lockfile
pnpm exec playwright install chromium
pnpm verify
pnpm preview --port 4330
```

检查首页、第二页、文章、画廊、笔记、标签、归档、关于、404、中英文切换、主题及搜索。开发服务器会展示草稿，不能作为发布产物验收的替代。

## 上线检查

- 确认正式 URL、站点名称和作者介绍，替换或移除演示内容。
- 检查中文及英文首页、直接访问文章、刷新和 404。
- 通过真实域名验证图片、搜索、RSS、Sitemap、canonical 和已有译文关系。
- 确认草稿 URL 不可访问，草稿不出现在列表、搜索或订阅中。
- 需要回退时通过 Pages 回退到此前成功部署，并以 Git 记录恢复对应内容版本。

## 当前交付状态

本任务交付本地应用、静态构建、CI 文件和部署说明。代码已推送到 GitHub `main`，并已触发 GitHub Actions 验收；未绑定 Cloudflare 项目、未设置真实域名、未执行线上部署。具体验收结果见 `docs/acceptance.md`。
