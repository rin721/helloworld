/*
 * 在我们的内容模型下新建一篇内容：content/posts/<id>/{zh,en}.md。
 * 用法：pnpm new-post <id>（id 使用小写字母、数字与连字符）
 */

import fs from "node:fs";
import path from "node:path";

function today() {
	const now = new Date();
	const year = now.getFullYear();
	const month = String(now.getMonth() + 1).padStart(2, "0");
	const day = String(now.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}T${String(now.getHours()).padStart(2, "0")}:00:00Z`;
}

const [id] = process.argv.slice(2);

if (!id) {
	console.error("用法：pnpm new-post <id>，例如 pnpm new-post a-quieter-morning");
	process.exit(1);
}

if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) {
	console.error("内容标识必须是小写字母、数字与连字符，例如 a-quieter-morning");
	process.exit(1);
}

const dir = path.join("content/posts", id);
if (fs.existsSync(dir)) {
	console.error(`内容目录已存在：${dir}`);
	process.exit(1);
}

const frontmatter = (title, lang) => `---
title: ${title}
publishedAt: ${today()}
kind: article # article | diary | note
layout: text # text | illustrated | gallery
tags: []
draft: true # 草稿只在本地开发预览中可见
summary: ""
---

${lang === "zh" ? "在这里写下正文。" : "Write the story here."}
`;

fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, "zh.md"), frontmatter(id, "zh"));
fs.writeFileSync(path.join(dir, "en.md"), frontmatter(id, "en"));

console.log(`已创建 ${dir}/zh.md 与 ${dir}/en.md（默认草稿，翻译可选，可删除不需要的语言文件）`);
