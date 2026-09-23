# 开发规范

## 实现分层

`src/content.config.ts` 负责内容类型和 schema。`scripts/check-content.ts` 负责构建前文件校验。`src/lib/rules.ts` 是无 Astro 运行时依赖的纯规则，供测试和查询共享。`src/lib/posts.ts` 使用内容集合并提供页面所需的数据。

Astro 页面只负责路由数据与布局组合；视觉由 `src/components/ui/` 的公共组件组合而成，模板共用布局、卡片、Hero、分页与背景组件。浏览器脚本集中于 `src/scripts/`，其中 `src/scripts/ui/` 是与组件配套的交互控制器（主题、配色、模态、浮层、展开区域、分段选择、页头滚动状态），`motion.ts` 负责空间动效。服务端组件只能引用 `src/lib/` 这类不触碰 DOM 的模块（例如 `palettes.ts` 的配色名单），否则会在构建期触发 `matchMedia is not defined`。避免把内容读取逻辑传入客户端。当前无后端 API、客户端路由器或框架运行时。

## 软导航

站点在 `Base.astro` 中引入 `<ClientRouter />`，站内链接走客户端导航，地址栏仍用 `pushState` 更新。改动脚本时必须遵守三条约定，细节见 [UI 组件与交互机制](design/components.md#与软导航配合的生命周期契约)：

- 文档级监听只注册一次并使用事件委托；同一 URL 的模块脚本整会话不会重复执行。
- 页面级增强（代码复制、目录观察器、图片查看、控件同步）放在 `astro:page-load`，并且必须幂等。
- `astro:before-swap` 复位模态与浮层；`astro:after-swap` 写回根元素属性（主题与 `js` 类）。

非 HTML 目标需要 `data-astro-reload`，`scripts/check-output.ts` 会断言所有 `.xml` 链接都带该属性。预取策略在 `astro.config.mjs` 中显式声明为悬停触发。

## 命令与依赖

使用仓库锁文件和 pnpm 10.22.0。Node.js 版本不低于 22.12.0，CI 使用 Node 24。新增依赖需要说明它补充的具体能力，不替代已有技术基线。

`package.json` 的 `packageManager` 固定为 pnpm 10.22.0；如果机器上 PATH 解析到更新的 pnpm（例如 11.x），它会因为锁文件中没有对应的 `packageManager` 依赖条目而拒绝执行脚本，报错为「The packageManager dependency "pnpm@10.22.0" in pnpm-lock.yaml must use a registry package path and an integrity-only resolution」。此时改用锁定的版本执行，例如把 `%LOCALAPPDATA%\pnpm\.tools\pnpm\10.22.0\bin` 放到 PATH 前面，或直接调用该目录下的 `pnpm.CMD`；不要为了迁就本地 pnpm 版本去重写锁文件。

`pnpm verify` 顺序执行类型检查、单元测试、完整构建和浏览器验收。单独使用 `pnpm check`、`pnpm test`、`pnpm build` 或 `pnpm test:e2e` 可定位失败阶段。构建后自动执行内部链接、图片、RSS、Sitemap 和草稿检查，并额外断言产物不使用系统下拉框、`details`、`dialog` 或系统提示框，不含被替代的旧组件样式，且关键页面确实使用 Tailwind 工具类布局。

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
- 保持语义化结构、单个主标题、可见焦点和真实链接。新交互复用 `src/components/ui/` 与 `src/scripts/ui/`；模态层必须支持关闭、焦点循环与焦点恢复，系统下拉框、`details` 与 `dialog` 不作为产品交互方案。
- 布局与状态优先用 Tailwind 工具类和语义设计变量表达；需要新增全局 CSS 时同步说明它属于主题、Markdown 排版还是几何绘制，并删除被替代的旧规则。
- 改动完成后更新对应文档和任务证据。不要把测试通过写成用户已经完成主观设计评审。
