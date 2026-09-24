import { mkdir } from "node:fs/promises";
import path from "node:path";
import { expect, type Page } from "@playwright/test";

const evidenceRoot = path.resolve("docs/evidence");

/**
 * 保存真实浏览器截图作为视觉验收证据：截图前等待入场动画结束，
 * 避免把透明度为 0 的中间帧存成证据。
 */
export async function capture(
	page: Page,
	group: string,
	name: string,
	options: { fullPage?: boolean; wait?: number } = {},
) {
	const dir = path.join(evidenceRoot, group);
	await mkdir(dir, { recursive: true });
	await expect(page.locator("body")).toBeVisible();
	await page.waitForTimeout(options.wait ?? 450);
	await page.screenshot({
		path: path.join(dir, `${name}.png`),
		fullPage: options.fullPage ?? true,
	});
}

export const viewports = {
	desktop: { width: 1440, height: 900 },
	tablet: { width: 768, height: 1024 },
	mobile: { width: 390, height: 844 },
} as const;
