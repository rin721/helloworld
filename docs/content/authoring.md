# 内容维护指南

## 新增文章

创建 `content/posts/my-entry/zh.md`，目录名使用小写英文、数字和连字符。目录标识组成永久链接（中文 `/posts/my-entry/`，英文 `/en/posts/my-entry/`），同一目录下的 `en.md` 是对应英文版本。推荐用生成命令创建中英文草稿：

```powershell
pnpm new-post my-entry   # 生成 zh.md 与 en.md 两份草稿
```

分别编辑这两个文件。下面是项目支持的双语模板（译文由作者撰写，不会自动翻译）：

`content/posts/my-entry/zh.md`：

```yaml
---
title: "今天注意到的一件小事"
publishedAt: 2026-09-23T08:00:00Z
kind: article # article | diary | note
layout: illustrated # text | illustrated | gallery
tags: ["日常", "观察"]
summary: "可选摘要；删除此行则从正文生成摘要。"
cover: ./morning.png # 可选；图片放在同一文章目录
coverAlt: "清晨落在窗边的光" # 使用 cover 时填写
draft: true
---

## 留意一个瞬间

在这里写下中文正文。图片使用相对路径，例如：

![清晨落在窗边的光](./morning.png)
```

`content/posts/my-entry/en.md`：

```yaml
---
title: "A small thing I noticed today"
publishedAt: 2026-09-23T08:00:00Z
kind: article
layout: illustrated
tags: ["Everyday", "Observation"]
summary: "Optional English summary. Remove this line to generate one from the body."
cover: ./morning.png
coverAlt: "Morning light by the window"
draft: true
---

## Notice a moment

Write the English version here. Keep image paths relative to this directory:

![Morning light by the window](./morning.png)
```

标题、日期、用途（`kind`）、展示形式（`layout`）及至少一个标签必填。每种语言的标题、摘要、标签和正文都应使用该语言。中英文通常共享发布日期、用途、展示形式和图片文件；`coverAlt` 则应按语言翻译。日期统一写成带 `Z` 的 UTC 时间，避免构建环境出现日期偏移。修改文章目录名会改变 URL，应同时处理旧链接。

## 用途与展示形式

- `kind`：`article`（文章）、`diary`（日记）、`note`（学习笔记）。它在界面上映射为侧栏「分类」与归档筛选用的分类名，映射表在 `src/config.ts` 的 `kindLabels`。
- `layout`：`text`（文字）、`illustrated`（图文）、`gallery`（图片分享）。画廊至少需要一张正文图片。

标签是可读名称，同一语言内保持拼写一致；支持中文与含空格的英文，不能包含 `/ # ? %`，避免链接歧义。

## 图片

图片与文章放在同一目录，用 `![有意义的替代文字](./morning.png)` 引用。主要内容图片使用本地资产以便构建校验与优化；不要把私人图片放进会直接复制到产物的 `public/`。

没有 `cover` 时自动采用正文第一张图片；没有图片时使用无图卡片。纯图片分享可以只写标题、元信息和图片。

## 摘要、精选和置顶

- `summary` 非空时直接使用；否则从正文提取最多 160 个字符，忽略图片与代码块。没有可提取文字时省略。
- `pinnedOrder: 0` 置顶，数字越小越靠前；同值按发布日期倒序，去掉字段即恢复时间排序。
- `featured`、`demo` 仍保留在 schema 中，但当前界面不再单独展示精选区块或演示标记；新增内容可以不写这两个字段。

## 译文

将同一篇内容的译文保存为相同目录中的 `en.md`，标题、正文、摘要和标签自行翻译。生成器会同时创建两份模板，但译文不是自动生成的：暂时不需要英文版时，可以删除 `en.md`。每个版本有独立发布状态；没有译文完全合法，系统不会自动翻译或复制原文。

- 中文列表、RSS 与搜索只收录中文版本，英文同理。
- 文章页在有译文时显示「阅读英文版／阅读中文版」入口；没有译文时不显示该入口。
- 导航栏的语言切换只处理首页、分页、归档与关于页，文章页由上面的译文入口负责。

## 预览与发布

1. 写作时保留 `draft: true`，运行 `pnpm dev` 在本地查看（此时 `/posts/<id>/` 也能看到草稿）。
2. 选择要发布的语言版本，在对应文件中将 `draft` 改为 `false` 或删除该字段；另一语言仍为草稿时不会随之发布。准备好后再分别发布该语言的译文。
3. 执行 `pnpm content:check`；错误会指出文件和原因。生成模板中的示例标题与标签也要替换。
4. 执行 `pnpm build`，再执行 `pnpm preview --port 4330` 检查真实产物与导航栏搜索。草稿不会进入发布产物。
5. 按自己的 Git 发布流程提交内容并触发 Pages 构建。

首版没有定时发布：`publishedAt` 用于展示与排序，是否公开由 `draft` 决定。写入未来日期不会自动延迟发布。

## 关于页

关于页正文在 `content/pages/about-zh.md` 与 `content/pages/about-en.md`，分别对应 `/about/` 与 `/en/about/`。只写 `title` 与正文即可。
