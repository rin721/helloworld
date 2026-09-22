import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwind from '@tailwindcss/vite';
import contentAssets from './scripts/content-assets.ts';

try { process.loadEnvFile(); } catch (error) { if (error.code !== 'ENOENT') throw error; }
const site = process.env.SITE_URL || process.env.CF_PAGES_URL || 'http://localhost:4321';
export default defineConfig({
  site,
  output: 'static',
  trailingSlash: 'always',
  integrations: [contentAssets(), sitemap({ filter: (url) => !url.endsWith('/404/') })],
  vite: { plugins: [tailwind()] },
  markdown: { shikiConfig: { themes: { light: 'github-light', dark: 'github-dark' }, defaultColor: false } },
  i18n: { defaultLocale: 'zh', locales: ['zh', 'en'], routing: { prefixDefaultLocale: true } },
});
