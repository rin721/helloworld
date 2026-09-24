# Cloudflare Pages 部署与验收

## 构建边界

部署产物是 `dist/` 中的静态页面、样式、浏览器脚本、优化图片和 Pagefind 索引。Node.js 只在构建和本地工具中使用，生产站点不需要 Node 服务或 Pages Functions。

构建链路是 `pnpm content:check && astro build && pagefind --site dist && tsx scripts/check-output.ts`（即 `pnpm build`）：先校验内容，再生成静态页面，然后建立搜索索引，最后检查产物中不残留草稿、`/zh/` 链接与系统控件。

## Git 集成配置

在 Cloudflare Pages 连接当前 GitHub 仓库：

| 设置 | 值 |
| --- | --- |
| 生产分支 | `main` |
| 根目录 | 仓库根目录 |
| 构建命令 | `pnpm check && pnpm test && pnpm build` |
| 输出目录 | `dist` |
| `NODE_VERSION` | `24` |
| `PNPM_VERSION` | `10.22.0` |
| `SITE_URL` | 正式 HTTPS 域名，包含协议 |

URL 优先级为 `SITE_URL` → `CF_PAGES_URL` → `http://localhost:4321`。本地可通过 `.env` 配置；设置自定义域名后必须更新 `SITE_URL` 并重新构建，以更新 canonical、RSS 与 Sitemap。

`public/_redirects` 把旧的 `/zh/…` 链接 301 到对应的根路径（中文不再带语言前缀），`public/_headers` 为 `_astro` 与 `assets` 设置长缓存并补充基础安全头。

GitHub Actions（`.github/workflows/ci.yml`）执行 Biome 检查、`pnpm verify` 全链路并把 Playwright 证据与 `dist/` 作为产物上传。若要让 E2E 失败阻止合入生产分支，需要在仓库分支保护中把 CI 配置为必需检查；本地代码不会自动修改远端规则。

参考：[Astro 的 Pages 部署说明](https://developers.cloudflare.com/pages/framework-guides/deploy-an-astro-site/)。

## 本地验收

```powershell
pnpm install --frozen-lockfile
pnpm exec playwright install chromium
pnpm verify
pnpm preview --port 4330
```

检查首页与第二页、文章（目录、封面、许可协议、上一篇／下一篇、译文入口）、归档与分类筛选、关于、404、中英切换、明暗与主题色、导航栏搜索。开发服务器会展示草稿，不能作为发布产物验收的替代。

若本机 `pnpm` 因 `packageManager` 固定版本报错，用 `npx --yes pnpm@10.22.0 <同样的命令>` 执行。

## 上线检查

- 确认正式 URL、站点名称与作者介绍，替换或移除演示内容（`content/posts/` 下的演示文章与 `src/assets/images/demo-*.png`）。
- 检查中文与英文首页、直接访问文章、刷新和 404。
- 通过真实域名验证图片、搜索、RSS、Sitemap 以及中英译文互相链接。
- 确认草稿 URL 不可访问，草稿不出现在列表、搜索或订阅中，且 `dist/` 中没有草稿图片。
- 需要回退时通过 Pages 回退到此前的成功部署，并以 Git 记录恢复对应内容版本。

## 当前交付状态

本次交付本地实现、静态构建、CI 配置与部署说明；代码未提交、未推送，未绑定 Cloudflare 项目、未设置真实域名、未执行线上部署。验证结果与截图证据见 [视觉证据](evidence/README.md)。
