# 项目文档入口

## 权威来源

| 文档 | 负责的问题 |
| --- | --- |
| [内容维护](content/authoring.md) | 作者如何写作、组织图片、发布及翻译 |
| [部署与验收](deployment.md) | Cloudflare Pages 配置、构建边界和上线检查 |
| [决策记录](decisions/0004-fuwari-based-rebuild.md) | 为什么以 fuwari 为源码基线，以及由此产生的后果 |
| [视觉证据](evidence/README.md) | 桌面、平板、手机与深色主题截图及像素统计 |
| [AGENTS.md](../AGENTS.md) | 代理与协作者的长期约束 |
| [README](../README.md) | 快速开始、命令表与文档索引 |

## 更新方式

内容协议变化时更新 `docs/content/authoring.md` 与 `src/content.config.ts`；部署或构建流程变化时更新 `docs/deployment.md`；界面变化时重跑 `pnpm test:e2e` 并刷新 `docs/evidence/` 截图；分层或技术基线变化时新增 ADR，而不是改写历史决策。协作行为只在 `AGENTS.md` 中定义，避免同一规则分散多份文档。

历史方向的说明（旧的几何光影视觉、五套配色、`/[locale]/[taxonomy]/` 标签路由等）已随基座替换删除，不再作为当前实现的依据。
