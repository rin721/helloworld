import { describe, expect, it } from "vitest";
import { isHomePath, localeFromPathname, localePath } from "../../src/utils/locale";
import {
	getArchiveUrl,
	getCategoryUrl,
	getPostUrl,
	getRssUrl,
	getTagUrl,
	switchLocaleUrl,
} from "../../src/utils/url-utils";

describe("语言路径", () => {
	it("默认语言不带前缀，英文带 /en/", () => {
		expect(localePath("zh")).toBe("/");
		expect(localePath("en")).toBe("/en/");
		expect(localePath("zh", "archive")).toBe("/archive/");
		expect(localePath("en", "archive")).toBe("/en/archive/");
		expect(localePath("zh", "posts/a-quieter-morning")).toBe("/posts/a-quieter-morning/");
	});

	it("从路径判断语言", () => {
		expect(localeFromPathname("/")).toBe("zh");
		expect(localeFromPathname("/archive/")).toBe("zh");
		expect(localeFromPathname("/en/archive/")).toBe("en");
	});

	it("识别首页", () => {
		expect(isHomePath("/")).toBe(true);
		expect(isHomePath("/en/")).toBe(true);
		expect(isHomePath("/en")).toBe(true);
		expect(isHomePath("/archive/")).toBe(false);
	});
});

describe("站内链接", () => {
	it("文章、归档与 RSS 跟随语言", () => {
		expect(getPostUrl("zh", "a-place-to-begin")).toBe("/posts/a-place-to-begin/");
		expect(getPostUrl("en", "a-place-to-begin")).toBe("/en/posts/a-place-to-begin/");
		expect(getArchiveUrl("en")).toBe("/en/archive/");
		expect(getRssUrl("zh")).toBe("/rss.xml");
		expect(getRssUrl("en")).toBe("/en/rss.xml");
	});

	it("标签与分类筛选带上语言与查询参数", () => {
		expect(getTagUrl("学习", "zh")).toBe(`/archive/?tag=${encodeURIComponent("学习")}`);
		expect(getTagUrl("Learning", "en")).toBe(`/en/archive/?tag=${encodeURIComponent("Learning")}`);
		expect(getCategoryUrl("学习笔记", "zh")).toContain("/archive/?category=");
	});
});

describe("语言切换", () => {
	it("固定页面可以互相切换", () => {
		expect(switchLocaleUrl("/", "en")).toBe("/en/");
		expect(switchLocaleUrl("/en/", "zh")).toBe("/");
		expect(switchLocaleUrl("/archive/", "en")).toBe("/en/archive/");
		expect(switchLocaleUrl("/en/about/", "zh")).toBe("/about/");
		expect(switchLocaleUrl("/2/", "en")).toBe("/en/2/");
		expect(switchLocaleUrl("/en/3/", "zh")).toBe("/3/");
	});

	it("文章页由文章自身的译文链接负责，不在导航里猜路径", () => {
		expect(switchLocaleUrl("/posts/a-quieter-morning/", "en")).toBeUndefined();
		expect(switchLocaleUrl("/en/posts/a-quieter-morning/", "zh")).toBeUndefined();
	});
});
