import { describe, expect, it } from "vitest";
import {
	firstImage,
	imageReferences,
	isPublished,
	normalizeCover,
	paginate,
	sortPosts,
	summarize,
	translationOf,
} from "../../src/lib/rules";

describe("摘要规则", () => {
	it("优先使用手写摘要", () => {
		expect(summarize("正文内容", "  手写摘要  ")).toBe("手写摘要");
	});

	it("从正文提取纯文本并去除图片、代码与链接语法", () => {
		const body = "# 标题\n\n![封面](./a.png)\n\n见 [文档](https://example.com) 与 `code`。\n\n```js\nconst a = 1;\n```";
		const summary = summarize(body);
		expect(summary).toContain("标题");
		expect(summary).toContain("文档");
		expect(summary).not.toContain("![");
		expect(summary).not.toContain("const a = 1");
	});

	it("最多 160 个字符并以省略号结尾", () => {
		const summary = summarize("字".repeat(400));
		expect(Array.from(summary)).toHaveLength(160);
		expect(summary.endsWith("…")).toBe(true);
	});
});

describe("图片解析", () => {
	it("识别行内图片与引用式图片", () => {
		const body = '![a](./one.png)\n\n![b][ref]\n\n[ref]: ./two.png';
		expect(imageReferences(body)).toEqual(["./one.png", "./two.png"]);
		expect(firstImage(body)).toBe("./one.png");
	});

	it("忽略代码块中的图片语法", () => {
		expect(imageReferences("```md\n![x](./hidden.png)\n```")).toEqual([]);
	});
});

describe("封面归一化", () => {
	it("位图保留尺寸元数据，只把相对地址补成站点路径", () => {
		const raster = { src: "./light.png", width: 1200, height: 800, format: "png" };
		expect(normalizeCover(raster, "a-quieter-morning")).toEqual({
			...raster,
			src: "/content/posts/a-quieter-morning/light.png",
		});
		expect(normalizeCover({ src: "/_astro/light.webp", width: 10, format: "webp" }, "g")).toEqual({
			src: "/_astro/light.webp",
			width: 10,
			format: "webp",
		});
	});

	it("SVG 的组件工厂只取地址，不当作位图交给图片优化", () => {
		const factory = Object.assign(() => undefined, { src: "/_astro/cover.svg", width: 640, height: 360, format: "svg" });
		expect(normalizeCover(factory, "svg-post")).toBe("/_astro/cover.svg");
		const relativeFactory = Object.assign(() => undefined, { src: "./cover.svg", format: "svg" });
		expect(normalizeCover(relativeFactory, "svg-post")).toBe("/content/posts/svg-post/cover.svg");
	});

	it("虚拟模块给出的相对 URL 与远程地址都被正确处理", () => {
		expect(normalizeCover("./draft-private.svg", "unpublished-example")).toBe(
			"/content/posts/unpublished-example/draft-private.svg",
		);
		expect(normalizeCover("https://example.com/a.png", "g")).toBe("https://example.com/a.png");
		expect(normalizeCover(undefined, "g")).toBeUndefined();
		expect(normalizeCover({}, "g")).toBeUndefined();
	});
});

describe("排序与分页", () => {
	const posts = [
		{ id: "a", publishedAt: new Date("2026-01-01") },
		{ id: "b", publishedAt: new Date("2026-03-01") },
		{ id: "c", publishedAt: new Date("2026-02-01"), pinnedOrder: 0 },
	];

	it("置顶优先，其次按日期倒序", () => {
		expect(sortPosts(posts).map((post) => post.id)).toEqual(["c", "b", "a"]);
	});

	it("分页返回当前页与总数", () => {
		const page = paginate([1, 2, 3, 4, 5], 2, 2);
		expect(page.items).toEqual([3, 4]);
		expect(page.total).toBe(3);
		expect(page.count).toBe(5);
	});

	it("页码越界时抛错", () => {
		expect(() => paginate([1, 2, 3], 0)).toThrow();
		expect(() => paginate([1, 2, 3], 4, 1)).toThrow();
	});
});

describe("发布与译文规则", () => {
	it("草稿只在开发环境可见", () => {
		expect(isPublished(true, false)).toBe(false);
		expect(isPublished(true, true)).toBe(true);
		expect(isPublished(false, false)).toBe(true);
	});

	it("按内容组找到另一语言的版本", () => {
		const posts = [
			{ group: "a", locale: "zh" },
			{ group: "a", locale: "en" },
			{ group: "b", locale: "zh" },
		];
		expect(translationOf(posts[0], posts)?.locale).toBe("en");
		expect(translationOf(posts[2], posts)).toBeUndefined();
	});
});
