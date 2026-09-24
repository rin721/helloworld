import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import * as cheerio from "cheerio";

/**
 * 产物检查：确认构建结果满足发布约束（草稿不外泄、中文不再带 /zh 前缀、
 * 不使用系统控件承担交互、搜索索引与站点地图存在、页面确实消费了 Tailwind 工具类）。
 */

const dist = path.resolve("dist");
const errors: string[] = [];
const fail = (message: string) => errors.push(message);

async function exists(target: string): Promise<boolean> {
	try {
		await access(target);
		return true;
	} catch {
		return false;
	}
}

async function htmlFiles(dir: string): Promise<string[]> {
	const out: string[] = [];
	for (const entry of await readdir(dir, { withFileTypes: true })) {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) out.push(...(await htmlFiles(full)));
		else if (entry.name.endsWith(".html")) out.push(full);
	}
	return out;
}

for (const required of [
	"index.html",
	"2/index.html",
	"archive/index.html",
	"about/index.html",
	"404.html",
	"en/index.html",
	"en/archive/index.html",
	"en/about/index.html",
	"rss.xml",
	"en/rss.xml",
	"sitemap-index.xml",
	"robots.txt",
	"pagefind/pagefind.js",
]) {
	if (!(await exists(path.join(dist, required)))) fail(`缺少必需产物：${required}`);
}

const pages = await htmlFiles(dist);
for (const page of pages) {
	const relative = path.relative(dist, page).split(path.sep).join("/");
	const raw = await readFile(page, "utf8");
	const $ = cheerio.load(raw);

	if (/href="\/zh(\/|")/.test(raw)) fail(`${relative}: 残留 /zh 链接`);
	if (/unpublished-example|draft-private/.test(raw)) fail(`${relative}: 残留草稿内容或草稿资产`);
	if ($("select, details, summary, dialog").length > 0)
		fail(`${relative}: 出现系统下拉框或 details/summary/dialog`);

	if (relative.endsWith("index.html") && !relative.startsWith("pagefind")) {
		if ($("[class*='px-'], [class*='flex'], [class*='rounded'], [class*='text-']").length === 0)
			fail(`${relative}: 页面没有使用 Tailwind 工具类`);
	}

	if (relative.startsWith("posts/") || relative.startsWith("en/posts/")) {
		if ($("[data-pagefind-body]").length === 0) fail(`${relative}: 文章缺少 data-pagefind-body`);
		if ($("#post-container").length === 0) fail(`${relative}: 文章缺少正文容器`);
	}
}

const searchIndex = await readdir(path.join(dist, "pagefind")).catch(() => []);
if (!searchIndex.some((file) => file.startsWith("pagefind."))) fail("Pagefind 索引文件缺失");

const sitemap = await readFile(path.join(dist, "sitemap-0.xml"), "utf8").catch(() => "");
if (!sitemap) fail("sitemap-0.xml 缺失");
else {
	if (!sitemap.includes("/en/")) fail("sitemap 缺少英文页面");
	if (sitemap.includes("/zh/")) fail("sitemap 残留 /zh 链接");
	if (sitemap.includes("unpublished-example")) fail("sitemap 残留草稿");
}

const zhHome = await readFile(path.join(dist, "index.html"), "utf8").catch(() => "");
if (zhHome && !zhHome.includes('href="/en/"')) fail("中文首页缺少英文入口");

const enHome = await readFile(path.join(dist, "en/index.html"), "utf8").catch(() => "");
if (enHome && !enHome.includes('href="/archive/"') && !enHome.includes('href="/en/archive/"'))
	fail("英文首页缺少归档入口");

if (errors.length) {
	console.error(`产物检查失败（${errors.length} 项）：\n- ${errors.join("\n- ")}`);
	process.exitCode = 1;
} else {
	console.log(`产物检查通过：${pages.length} 个 HTML 页面与索引、站点地图、RSS 均符合发布约束。`);
}
