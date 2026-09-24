import { test } from "@playwright/test";
import { capture, viewports } from "./evidence";

/**
 * 视觉证据：桌面、平板、手机各一轮，另加深色主题。
 * 截图写入 docs/evidence/，用于人工复核界面是否仍然完整。
 */
test.describe("视觉证据", () => {
	for (const [name, viewport] of Object.entries(viewports)) {
		test(`${name} 尺寸下的主要页面`, async ({ page }) => {
			await page.setViewportSize(viewport);

			await page.goto("/");
			await capture(page, name, "home-zh");

			await page.goto("/en/");
			await capture(page, name, "home-en");

			await page.goto("/posts/a-quieter-morning/");
			await capture(page, name, "post-zh");

			await page.goto("/archive/");
			await capture(page, name, "archive-zh");

			if (name === "desktop") {
				await page.goto("/about/");
				await capture(page, name, "about-zh", { fullPage: false });
			}
		});
	}

	test("深色主题下的首页与文章页", async ({ page }) => {
		await page.setViewportSize(viewports.desktop);
		await page.goto("/");
		await page.evaluate(() => {
			localStorage.setItem("theme", "dark");
			document.documentElement.classList.add("dark");
		});
		await capture(page, "dark", "home-zh");

		await page.goto("/posts/light-and-space/");
		await capture(page, "dark", "post-zh");
	});

	test("搜索面板与移动端导航", async ({ page }) => {
		await page.setViewportSize(viewports.desktop);
		await page.goto("/en/");
		const input = page.locator("#search-bar input");
		await input.click();
		await input.fill("quieter");
		await page.locator("#search-panel a").first().waitFor({ timeout: 15000 });
		await capture(page, "desktop", "search-en", { fullPage: false });

		await page.setViewportSize(viewports.mobile);
		await page.goto("/");
		await page.locator("#nav-menu-switch").click();
		await capture(page, "mobile", "nav-menu", { fullPage: false });
	});
});
