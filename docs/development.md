# 开发规范

## 实现分层

`src/content.config.ts` 负责内容类型和 schema。`scripts/check-content.ts` 负责构建前文件校验。`src/lib/rules.ts` 是无 Astro 运行时依赖的纯规则，供测试和查询共享。`src/lib/posts.ts` 使用内容集合并提供页面所需的数据。

Astro 页面只负责路由数据与布局组合；模板共用布局、卡片、Hero 和分页组件。浏览器脚本集中于 `src/scripts/`，避免把内容读取逻辑传入客户端。当前无后端 API、客户端路由器或框架运行时。

## 命令与依赖

使用仓库锁文件和 pnpm 10.22.0。Node.js 版本不低于 22.12.0，CI 使用 Node 24。新增依赖需要说明它补充的具体能力，不替代已有技术基线。

`pnpm verify` 顺序执行类型检查、单元测试、完整构建和浏览器验收。单独使用 `pnpm check`、`pnpm test`、`pnpm build` 或 `pnpm test:e2e` 可定位失败阶段。构建后自动执行内部链接、图片、RSS、Sitemap 和草稿检查。

## 浏览器测试

首次执行 `pnpm exec playwright install chromium`。Playwright 在 4329 启动独立的静态预览服务器，设置 `reuseExistingServer: false`，避免连接开发服务。Astro 7 在代理环境下自动后台启动，测试命令加 `--ignore-lock`，使 Playwright 管理其生命周期。

需要使用已安装的 Microsoft Edge 时，可以在 PowerShell 当前会话中执行：

```powershell
$env:PLAYWRIGHT_CHANNEL = 'msedge'
pnpm test:e2e
Remove-Item Env:PLAYWRIGHT_CHANNEL
```

测试产物在 `test-results/` 和 `playwright-report/`，已从 Git 和类型检查排除。视觉测试等待本地图片解码后截图，防止全页截图出现尚未进入视口的懒加载空图。

## 修改要求

- 修改内容协议需同步 schema、构建校验、维护文档和边界测试。
- 修改页面路由需检查直接访问、刷新、语言切换及禁用 JavaScript 的行为。
- 共享 UI 文案与品牌配置集中维护；装饰性的英文短句属于视觉表达，功能性文字必须双语。
- 保持语义化结构、单个主标题、可见焦点和真实链接；弹窗必须支持关闭与焦点恢复。
- 改动完成后更新对应文档和任务证据。不要把测试通过写成用户已经完成主观设计评审。
