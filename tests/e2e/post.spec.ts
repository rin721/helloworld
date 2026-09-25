import { expect, test } from "@playwright/test";

test.describe("文章页", () => {
	test("文章页包含标题、元信息、封面、目录与许可协议", async ({ page }) => {
		// 目录只在 2xl 以上宽度显示，因此用宽屏断言它的可见性。
		await page.setViewportSize({ width: 1600, height: 1000 });
		await page.goto("/posts/a-quieter-morning/");

		await expect(page.locator("#post-container")).toContainText("把清晨，还给自己");
		await expect(page.locator("#post-container")).toContainText("文章");
		await expect(page.locator("#post-container")).toContainText("慢生活");
		await expect(page.locator("#post-container .custom-md")).toBeVisible();
		await expect(page.locator("#post-cover")).toBeVisible();
		await expect(page.locator(".license-container")).toContainText("CC BY-NC-SA 4.0");
		await expect(page.locator("#toc a").first()).toBeVisible();
	});

	test("文章正文不显示译文按钮，顶部导航始终提供语言切换", async ({ page }) => {
		await page.goto("/posts/a-quieter-morning/");
		await expect(page.locator("#post-container a[data-locale-switch]")).toHaveCount(0);
		await expect(page.locator('#navbar a[hreflang="en"]')).toHaveAttribute("href", "/en/");

		await page.goto("/en/posts/a-quieter-morning/");
		await expect(page.locator("#post-container a[data-locale-switch]")).toHaveCount(0);
		await expect(page.locator('#navbar a[hreflang="zh"]')).toHaveAttribute("href", "/");

		await page.goto("/posts/blue-hour/");
		await expect(page.locator('#navbar a[hreflang="en"]')).toHaveAttribute("href", "/en/");
	});

	test("同语言内提供上一篇与下一篇", async ({ page }) => {
		await page.goto("/posts/on-reading/");
		const next = page.locator('a[href^="/posts/"] .btn-card');
		expect(await next.count()).toBeGreaterThan(0);
		await expect(page.locator("#post-container")).toBeVisible();
	});

	test("英文文章使用英文元信息与界面文案", async ({ page }) => {
		await page.goto("/en/posts/static-by-design/");
		await expect(page.locator("html")).toHaveAttribute("lang", "en");
		await expect(page.locator("#post-container")).toContainText("Study note");
		await expect(page.locator("#post-container")).toContainText("words");
		await expect(page.locator("#post-container")).toContainText("Published at");
	});

	test("正文图片可以打开灯箱", async ({ page }) => {
		await page.goto("/posts/light-and-space/");
		const image = page.locator("#post-container .custom-md img").first();
		await expect(image).toBeVisible();
		await image.click();
		await expect(page.locator(".pswp")).toBeVisible();
	});

	test("软导航进入文章后灯箱仍然盖在正文之上", async ({ page }) => {
		await page.goto("/");
		await page.waitForFunction(() => Boolean((window as unknown as { swup?: unknown }).swup));
		await page.waitForTimeout(300);
		await page.evaluate(() => {
			(window as unknown as { __marker?: number }).__marker = 11;
		});

		await page.locator('a[href="/posts/light-and-space/"]').first().click();
		await expect(page).toHaveURL(/\/posts\/light-and-space\/$/);
		// marker 仍在说明这是软导航：swup 会更新 head 并删除运行时注入的 <style>，
		// 灯箱样式一旦不是页面级 CSS 就会丢失，表现为点击图片毫无反应。
		expect(
			await page.evaluate(() => (window as unknown as { __marker?: number }).__marker),
		).toBe(11);

		await page.locator("#post-container .custom-md img").first().click();
		const overlay = page.locator(".pswp");
		await expect(overlay).toBeVisible();
		const state = await overlay.evaluate((element) => {
			const style = getComputedStyle(element);
			const rect = element.getBoundingClientRect();
			const top = document.elementFromPoint(
				rect.left + rect.width / 2,
				rect.top + rect.height / 2,
			);
			return {
				position: style.position,
				zIndex: Number.parseInt(style.zIndex, 10),
				onTop: Boolean(top && element.contains(top)),
			};
		});
		expect(state.position).toBe("fixed");
		expect(state.zIndex).toBeGreaterThan(1000);
		expect(state.onTop).toBe(true);
	});
});
