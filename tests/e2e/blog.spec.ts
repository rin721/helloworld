import { test, expect } from '@playwright/test';

test('首页到详情、分页与类型筛选形成完整浏览路径', async ({ page }) => {
  await page.goto('/zh/');
  await expect(page.locator('.hero h1')).toHaveText('Hello World.');
  await expect(page.locator('.entry-list .entry-card')).toHaveCount(10);
  await page.locator('.pagination a[rel="next"]').click();
  await expect(page).toHaveURL(/\/zh\/page\/2\/#journal$/);
  await expect(page.locator('.hero')).toHaveCount(0);
  await expect(page.locator('.entry-list .entry-card')).toHaveCount(2);
  await page.reload();
  await page.getByRole('link',{name:'学习笔记',exact:true}).first().click();
  await expect(page.locator('.entry-list .entry-card')).toHaveCount(3);
  await page.locator('.entry-list h2 a').first().click();
  await expect(page.locator('#article-body')).toBeVisible();
  await expect(page.locator('.prose pre')).toHaveCount(1);
});
test('纯图片无摘要、首图回退，并能键盘查看下一张', async ({ page }) => {
  await page.goto('/zh/posts/light-and-space/');
  await expect(page.locator('.article-deck')).toHaveCount(0);
  const image = page.locator('.prose img').first();
  await image.focus(); await page.keyboard.press('Enter');
  await expect(page.locator('#lightbox')).toBeVisible();
  await expect(page.locator('#lightbox figcaption')).toContainText('1 / 2');
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('#lightbox figcaption')).toContainText('2 / 2');
  await page.keyboard.press('Escape');
  await expect(page.locator('#lightbox')).not.toBeVisible();
  await expect(image).toBeFocused();
  await page.goto('/zh/');
  await expect(page.locator('.entry-card').filter({has:page.locator('h2 a[href="/zh/posts/after-the-rain/"]')}).locator('img')).toBeVisible();
});
test('已有译文切换，无译文提示保留原文', async ({ page }) => {
  await page.goto('/zh/posts/a-quieter-morning/');
  await page.getByRole('link',{name:'Switch to English'}).click();
  await expect(page).toHaveURL('/en/posts/a-quieter-morning/');
  await expect(page.locator('html')).toHaveAttribute('lang','en');
  await page.goto('/zh/posts/blue-hour/');
  await page.getByRole('button',{name:'English translation unavailable'}).click();
  await expect(page.locator('#translation-dialog')).toBeVisible();
  await expect(page).toHaveURL('/zh/posts/blue-hour/');
  await page.locator('#translation-dialog a').click();
  await expect(page).toHaveURL('/en/');
});
test('搜索使用真实索引，按语言匹配并支持空结果', async ({ page }) => {
  await page.goto('/zh/search/');
  await page.getByRole('searchbox').fill('构建');
  await expect(page.locator('.search-result').first()).toBeVisible({timeout:15000});
  await expect(page.locator('#search-results')).toContainText('构建');
  const hrefs = await page.locator('.search-result a').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('href')));
  expect(hrefs.every(h=>h?.startsWith('/zh/posts/'))).toBe(true);
  await page.getByRole('searchbox').fill('zzzxqnomatch999');
  await expect(page.locator('#search-status')).toHaveText('没有找到相关内容');
  await page.goto('/en/search/?q=static');
  await expect(page.locator('#search-results')).toContainText('Static by design',{timeout:15000});
});
test('搜索失败显示可操作反馈', async ({ page }) => {
  await page.route('**/pagefind/**',route=>route.abort());
  await page.goto('/zh/search/?q=test');
  await expect(page.locator('#search-status')).toContainText('搜索暂时不可用');
  await expect(page.getByRole('button',{name:'重试',exact:true})).toBeVisible();
});
test('主题选择跨页面持久化，代码可复制', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read','clipboard-write']);
  await page.goto('/zh/posts/static-by-design/');
  await page.getByLabel('外观',{exact:true}).selectOption('dark');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
  await page.getByRole('button',{name:'复制代码',exact:true}).click();
  await expect(page.getByRole('button',{name:'复制代码',exact:true})).toHaveText('已复制');
  expect(await page.evaluate(()=>navigator.clipboard.readText())).toContain('function published');
  await page.locator('.toc a').first().click();
  await expect(page).toHaveURL(/#/);
});
test('跟随系统主题响应系统变化，并尊重手动设置', async ({ page }) => {
  await page.emulateMedia({colorScheme:'dark',reducedMotion:'reduce'});
  await page.goto('/zh/');
  await expect(page.locator('html')).toHaveAttribute('data-resolved-theme','dark');
  await page.emulateMedia({colorScheme:'light'});
  await expect(page.locator('html')).toHaveAttribute('data-resolved-theme','light');
  await page.getByLabel('外观',{exact:true}).selectOption('dark');
  await page.emulateMedia({colorScheme:'light'});
  await expect(page.locator('html')).toHaveAttribute('data-resolved-theme','dark');
});
test('无 JavaScript 时内容与分页仍然可用', async ({ browser }) => {
  const context = await browser.newContext({javaScriptEnabled:false}); const page = await context.newPage();
  await page.goto('http://127.0.0.1:4329/zh/');
  await page.locator('.pagination a[rel="next"]').click();
  await expect(page.locator('.entry-list h2')).toHaveCount(2);
  await page.locator('.entry-list h2 a').first().click();
  await expect(page.locator('.prose')).toBeVisible();
  await context.close();
});
test('移动导航、页面宽度和视觉证据', async ({ page }, testInfo) => {
  for (const [name,width,height] of [['desktop',1440,1000],['tablet',768,1024],['mobile',390,844]] as const) {
    await page.setViewportSize({width,height}); await page.goto('/zh/');
    await expect(page.locator('.hero h1')).toBeVisible();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
    await page.locator('img').evaluateAll(async images => { await Promise.all(images.map(image => { if (!(image instanceof HTMLImageElement)) return; image.loading = 'eager'; return image.decode().catch(()=>{}); })); });
    await page.screenshot({path:testInfo.outputPath(`${name}-home.png`),fullPage:true,animations:'disabled'});
    if (name === 'desktop') await page.screenshot({path:testInfo.outputPath('desktop-fold.png'),animations:'disabled'});
    if(name==='mobile') { await page.getByRole('button',{name:'菜单',exact:true}).click(); await expect(page.locator('#main-nav')).toBeVisible(); await page.getByRole('link',{name:'归档',exact:true}).click(); await expect(page).toHaveURL('/zh/archive/'); }
  }
  await page.setViewportSize({width:1440,height:1000}); await page.goto('/zh/');
  await page.getByLabel('外观',{exact:true}).selectOption('dark');
  await page.screenshot({path:testInfo.outputPath('dark-home.png'),fullPage:true,animations:'disabled'});
  await page.screenshot({path:testInfo.outputPath('dark-fold.png'),animations:'disabled'});
  await page.goto('/en/'); await page.getByLabel('Appearance',{exact:true}).selectOption('light');
  await page.screenshot({path:testInfo.outputPath('english-home.png'),fullPage:true,animations:'disabled'});
  await page.goto('/zh/posts/static-by-design/');
  await page.screenshot({path:testInfo.outputPath('note-desktop.png'),fullPage:true,animations:'disabled'});
  await page.setViewportSize({width:390,height:844});
  await page.screenshot({path:testInfo.outputPath('note-mobile.png'),fullPage:true,animations:'disabled'});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});
test('归档、标签、关于、404 和草稿隔离', async ({ page, request }) => {
  for (const route of ['/zh/archive/','/en/archive/','/zh/tags/','/en/types/','/zh/about/','/en/about/']) {
    const response=await page.goto(route); expect(response?.ok()).toBe(true); await expect(page.locator('h1')).toHaveCount(1);
  }
  const missing=await page.goto('/not-a-real-page/'); expect(missing?.status()).toBe(404); await expect(page.locator('.error-number')).toHaveText('404');
  expect((await request.get('/zh/posts/unpublished-example/')).status()).toBe(404);
  // 精确短语避免 draft 被当作学习笔记中的代码关键词匹配。
  await page.goto('/zh/search/?q=%22DRAFT_ONLY_SENTINEL%22');
  await expect(page.locator('#search-status')).toHaveText('没有找到相关内容',{timeout:15000});
});
