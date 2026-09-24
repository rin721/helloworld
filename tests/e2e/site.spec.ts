import { expect, test } from "@playwright/test";

test.describe("站点结构与语言路由", () => {
	test("中文首页在根路径，不带 /zh 前缀", async ({ page }) => {
		await page.goto("/");
		await expect(page.locator("html")).toHaveAttribute("lang", "zh-CN");
		await expect(page.locator("#navbar")).toContainText("Rin's Blog");
		await expect(page.locator("#sidebar #categories")).toBeVisible();
		await expect(page.locator("#sidebar #tags")).toBeVisible();
		expect(page.url()).toMatch(/\/$/);
	});

	test("首页每页 10 条，分页落在 /2/", async ({ page }) => {
		await page.goto("/");
		const cards = page.locator("#swup-container .card-base");
		await expect(cards).toHaveCount(10);

		await page.goto("/2/");
		await expect(page.locator("#swup-container .card-base")).toHaveCount(2);
	});

	test("英文内容在 /en/ 下并使用英文界面文案", async ({ page }) => {
		await page.goto("/en/");
		await expect(page.locator("html")).toHaveAttribute("lang", "en");
		await expect(page.locator("#navbar")).toContainText("Archive");
		await expect(page.locator("#navbar")).toContainText("About");
		await expect(page.locator("#swup-container .card-base")).toHaveCount(6);
	});

	test("导航提供语言切换，且站内不存在 /zh 链接", async ({ page }) => {
		await page.goto("/");
		const switcher = page.locator('a[hreflang="en"]');
		await expect(switcher).toHaveAttribute("href", "/en/");

		await page.goto("/en/archive/");
		await expect(page.locator('a[hreflang="zh"]')).toHaveAttribute("href", "/archive/");

		const zhLinks = await page.locator('a[href^="/zh"]').count();
		expect(zhLinks).toBe(0);
	});

	test("归档页按年份分组并支持分类筛选", async ({ page }) => {
		await page.goto("/archive/");
		await expect(page.locator("#swup-container .card-base")).toBeVisible();
		const allPosts = page.locator('a[href^="/posts/"]');
		await expect(allPosts.first()).toBeVisible();
		expect(await allPosts.count()).toBe(12);

		await page.goto(`/archive/?category=${encodeURIComponent("日记")}`);
		const filtered = page.locator('a[href^="/posts/"]');
		await expect(filtered).toHaveCount(2);
	});

	test("关于页与 404 使用同一套布局", async ({ page }) => {
		await page.goto("/about/");
		await expect(page.locator("#navbar")).toBeVisible();
		await expect(page.locator(".custom-md")).toBeVisible();

		await page.goto("/en/about/");
		await expect(page.locator("html")).toHaveAttribute("lang", "en");

		const response = await page.goto("/this-page-does-not-exist/");
		expect(response?.status()).toBe(404);
		await expect(page.locator("body")).toContainText("404");
	});

	test("草稿只在本地开发可见", async ({ page }) => {
		const response = await page.goto("/posts/unpublished-example/");
		expect(response?.status()).toBe(404);
	});
});
