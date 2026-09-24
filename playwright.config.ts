import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
	testDir: "./tests/e2e",
	fullyParallel: true,
	workers: 3,
	retries: process.env.CI ? 1 : 0,
	reporter: [["list"], ["html", { open: "never" }]],
	use: {
		baseURL: "http://127.0.0.1:4329",
		trace: "retain-on-failure",
		channel: process.env.PLAYWRIGHT_CHANNEL,
	},
	// 验收只连接独立端口上的静态产物，不能复用包含草稿的开发服务器。
	// 直接用本地 astro 可执行文件起服务，避免依赖调用方的包管理器配置。
	webServer: {
		command: "npx astro preview --port 4329 --host 127.0.0.1 --ignore-lock",
		url: "http://127.0.0.1:4329/",
		reuseExistingServer: false,
	},
	projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
