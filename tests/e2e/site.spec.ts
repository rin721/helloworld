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

	test("首页桌面横幅恢复 65vh，其他页面维持常规高度", async ({ page }) => {
		await page.setViewportSize({ width: 1280, height: 900 });
		await page.goto("/");
		await expect(page.locator("body")).toHaveClass(/is-home/);
		const banner = page.locator("#banner-wrapper");
		await expect(banner).toBeVisible();
		const visibleHomeHeight = await banner.evaluate((element) => {
			const rect = element.getBoundingClientRect();
			return Math.max(0, Math.min(rect.bottom, window.innerHeight) - Math.max(0, rect.top));
		});
		expect(visibleHomeHeight).toBeGreaterThanOrEqual(576);

		await page.locator('#swup-container a[href^="/posts/"]').first().click();
		await expect(page.locator("body")).not.toHaveClass(/is-home/);
		const visiblePostHeight = await banner.evaluate((element) => {
			const rect = element.getBoundingClientRect();
			return Math.max(0, Math.min(rect.bottom, window.innerHeight) - Math.max(0, rect.top));
		});
		expect(visiblePostHeight).toBeLessThan(visibleHomeHeight);
	});

	test("首页侧栏 sticky 避开横幅延伸，文章页恢复常规顶部间距", async ({ page }) => {
		await page.setViewportSize({ width: 1280, height: 900 });
		await page.goto("/");
		await expect
			.poll(() => page.locator("#sidebar-sticky").evaluate((element) => getComputedStyle(element).top))
			.toBe("-252px");

		await page.locator('#swup-container a[href^="/posts/"]').first().click();
		await expect(page.locator("body")).not.toHaveClass(/is-home/);
		await expect
			.poll(() => page.locator("#sidebar-sticky").evaluate((element) => getComputedStyle(element).top))
			.toBe("16px");
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
		await expect(switcher).toHaveClass(/w-11/);
		await expect(switcher).not.toContainText("EN");
		await expect(switcher).not.toContainText("中文");

		await page.goto("/en/archive/");
		await expect(page.locator('a[hreflang="zh"]')).toHaveAttribute("href", "/archive/");

		const zhLinks = await page.locator('a[href^="/zh"]').count();
		expect(zhLinks).toBe(0);
	});

	test("语言切换载入目标语言并同步导航与侧栏", async ({ page }) => {
		await page.goto("/");
		await page.locator('#navbar a[data-locale-switch="en"]').click();
		await expect(page).toHaveURL(/\/en\/$/);
		await expect(page.locator("#navbar")).toContainText("Archive");
		await expect(page.locator("#sidebar #categories")).toContainText("Diary");
		await expect(page.locator('#navbar a[hreflang="zh"]')).toHaveAttribute("href", "/");
		await expect(page.locator("#search-bar input")).toHaveAttribute("placeholder", "Search");

		await page.locator('#navbar a[data-locale-switch="zh"]').click();
		await expect(page).toHaveURL(/\/$/);
		await expect(page.locator("#navbar")).toContainText("归档");
		await expect(page.locator("#sidebar #categories")).toContainText("日记");
		await expect(page.locator('#navbar a[hreflang="en"]')).toHaveAttribute("href", "/en/");
		await expect(page.locator("#search-bar input")).toHaveAttribute("placeholder", "搜索");
	});

	test("进入文章时保留导航栏、侧栏和岛屿组件实例", async ({ page }) => {
		await page.goto("/");
		await page.waitForFunction(() => Boolean((window as unknown as { swup?: unknown }).swup));
		await page.waitForTimeout(300);
		await page.evaluate(() => {
			const state = window as unknown as { persistentShell?: Node[] };
			state.persistentShell = [
				document.querySelector("#navbar")!,
				document.querySelector("#sidebar")!,
				document.querySelector("#search-bar input")!,
				document.querySelector("#scheme-switch")!,
			];
		});

		await page.locator('#swup-container a[href^="/posts/"]').first().click();
		await expect(page).toHaveURL(/\/posts\/.+\/$/);
		await expect(page.locator('#navbar a[hreflang="en"]')).toHaveAttribute("href", "/en/");
		expect(await page.evaluate(() => {
			const state = window as unknown as { persistentShell?: Node[] };
			const current = [
				document.querySelector("#navbar"),
				document.querySelector("#sidebar"),
				document.querySelector("#search-bar input"),
				document.querySelector("#scheme-switch"),
			];
			return state.persistentShell?.map((node, index) => node === current[index]);
		})).toEqual([true, true, true, true]);
	});

	test("语言选择跨刷新保留，根首页按偏好跳转，深链接尊重 URL", async ({ page }) => {
		await page.goto("/");
		await expect(page.locator("html")).toHaveAttribute("lang", "zh-CN");
		await page.locator('a[data-locale-switch="en"]').click();
		await expect(page).toHaveURL(/\/en\/$/);
		expect(await page.evaluate(() => localStorage.getItem("locale"))).toBe("en");

		await page.goto("/");
		await expect(page).toHaveURL(/\/en\/$/);
		await page.goto("/posts/a-quieter-morning/");
		await expect(page.locator("html")).toHaveAttribute("lang", "zh-CN");
		expect(await page.evaluate(() => localStorage.getItem("locale"))).toBe("zh");
	});

	test("软导航保存语言，缺失的目标分页回到目标首页", async ({ page }) => {
		await page.goto("/2/");
		await expect(page.locator('a[data-locale-switch="en"]')).toHaveAttribute("href", "/en/");
		await page.evaluate(() => {
			(window as unknown as { __marker?: number }).__marker = 42;
		});
		await page.locator('a[data-locale-switch="en"]').click();
		await expect(page).toHaveURL(/\/en\/$/);
		expect(await page.evaluate(() => (window as unknown as { __marker?: number }).__marker)).toBeUndefined();
		expect(await page.evaluate(() => localStorage.getItem("locale"))).toBe("en");
		await expect(page.locator('#navbar a[href="/en/"]').first()).toBeVisible();
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
