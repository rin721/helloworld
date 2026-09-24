import { expect, test } from "@playwright/test";

test.describe("交互与主题", () => {
	test("明暗模式可切换并在刷新后保持", async ({ page }) => {
		await page.goto("/");
		// LightDarkSwitch 是 client:only 组件，先等它挂载再点击，避免点到未绑定事件的按钮。
		await page.waitForFunction(() => !!document.getElementById("scheme-switch"));
		const html = page.locator("html");
		const isDark = () => html.evaluate((element) => element.classList.contains("dark"));

		// 默认是「跟随系统」，第一次点击切到浅色，第二次切到深色。
		while (!(await isDark())) {
			await page.locator("#scheme-switch").click();
			await page.waitForTimeout(150);
			if ((await page.evaluate(() => localStorage.getItem("theme"))) === "dark") break;
		}
		await expect.poll(isDark).toBe(true);
		await expect
			.poll(async () => page.evaluate(() => localStorage.getItem("theme")))
			.toBe("dark");

		await page.reload();
		await expect.poll(isDark).toBe(true);
	});

	test("主题色相可调整并写入根元素变量", async ({ page }) => {
		await page.goto("/");
		await page.waitForFunction(() => !!document.getElementById("display-setting"));
		await page.locator("#display-settings-switch").click();
		await expect(page.locator("#display-setting")).not.toHaveClass(/float-panel-closed/);

		const slider = page.locator("#colorSlider");
		await expect(slider).toBeVisible();
		await slider.evaluate((element: HTMLInputElement) => {
			element.value = "120";
			element.dispatchEvent(new Event("input", { bubbles: true }));
		});
		await expect
			.poll(async () => page.locator("html").evaluate((element) => element.style.getPropertyValue("--hue").trim()))
			.toBe("120");
	});

	test("搜索面板返回 Pagefind 结果", async ({ page }) => {
		await page.goto("/en/");
		const input = page.locator("#search-bar input");
		await input.click();
		await input.fill("quieter");
		await expect(page.locator("#search-panel a").first()).toBeVisible({ timeout: 15000 });
	});

	test("移动端导航面板可以打开", async ({ page }) => {
		await page.setViewportSize({ width: 390, height: 844 });
		await page.goto("/");
		await page.locator("#nav-menu-switch").click();
		await expect(page.locator("#nav-menu-panel")).not.toHaveClass(/float-panel-closed/);
		await expect(page.locator("#nav-menu-panel")).toContainText("归档");
	});

	test("软导航不整页刷新", async ({ page }) => {
		await page.goto("/");
		// 等 swup 接管链接后再点击；否则会落到原生跳转上，变成整页刷新。
		await page.waitForFunction(() => Boolean((window as unknown as { swup?: unknown }).swup));
		await page.waitForTimeout(300);
		await page.evaluate(() => {
			(window as unknown as { __marker?: number }).__marker = 1;
		});
		await page.locator('#navbar .hidden.md\\:flex a[href="/archive/"]').click();
		await expect(page).toHaveURL(/\/archive\/$/);
		const marker = await page.evaluate(
			() => (window as unknown as { __marker?: number }).__marker,
		);
		expect(marker).toBe(1);
	});
});
