import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  workers: 3,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: { baseURL: 'http://127.0.0.1:4329', trace: 'retain-on-failure', channel: process.env.PLAYWRIGHT_CHANNEL },
  // 验收只连接独立端口上的静态产物，不能误复用包含草稿的开发服务器。
  webServer: { command: 'pnpm preview --port 4329 --ignore-lock', url: 'http://127.0.0.1:4329/zh/', reuseExistingServer: false },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
