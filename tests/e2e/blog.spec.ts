import { test, expect, type Page } from '@playwright/test';
import sharp from 'sharp';
import { site } from '../../src/config';

/** 打开页头的“外观与配色”设置浮层，做完操作后收合，避免影响后续断言。 */
async function openSettings(page: Page, locale: 'zh' | 'en' = 'zh') {
  const label = locale === 'zh' ? '外观与配色' : 'Appearance & colour';
  // 页头会随滚动隐藏，先回到顶部，保证入口在视口内可点。
  // 桌面与移动各有一个触发器，同一视口只有一份可见；取第一个可见的，避免严格模式冲突。
  await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
  await page.waitForTimeout(120);
  await page.locator(`[data-header] button[aria-label="${label}"]:visible`).first().click();
  await expect(page.locator('[data-popover-panel]:visible')).toBeVisible();
}

async function closeSettings(page: Page) {
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-popover-panel]:visible')).toHaveCount(0);
}

/** 通过设置浮层里的分段选择切换明暗外观。 */
async function setTheme(page: Page, locale: 'zh' | 'en', value: 'system' | 'light' | 'dark') {
  const names = locale === 'zh'
    ? { system: '跟随系统', light: '浅色', dark: '深色' }
    : { system: 'System', light: 'Light', dark: 'Dark' };
  await openSettings(page, locale);
  await page.getByRole('radio', { name: names[value], exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', value);
  await closeSettings(page);
}

/** 通过设置浮层里的色板切换配色。 */
async function setPalette(page: Page, value: 'slate' | 'jade' | 'violet' | 'clay' | 'graphite', locale: 'zh' | 'en' = 'zh') {
  const names = locale === 'zh'
    ? { slate: '蓝灰', jade: '青绿', violet: '紫罗兰', clay: '暖橙', graphite: '石墨' }
    : { slate: 'Slate', jade: 'Jade', violet: 'Violet', clay: 'Clay', graphite: 'Graphite' };
  await openSettings(page, locale);
  await page.getByRole('radio', { name: names[value], exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-palette', value);
  await closeSettings(page);
}

/** 打开设置浮层确认外观控件的选中态（浮层收起时控件不在无障碍树里）。 */
async function expectThemeControl(page: Page, name: string, checked: boolean) {
  await openSettings(page);
  await expect(page.getByRole('radio', { name, exact: true })).toHaveAttribute('aria-checked', String(checked));
  await closeSettings(page);
}

/** 把任意 CSS 颜色（含 var() 引用与十六进制）解析成 rgb，供对比度计算。 */
async function resolveColors(page: Page, values: string[]) {
  return page.evaluate(list => {
    const probe = document.createElement('span');
    probe.style.position = 'absolute';
    probe.style.opacity = '0';
    document.body.append(probe);
    const out: Record<string, { r: number; g: number; b: number }> = {};
    for (const value of list) {
      probe.style.color = value;
      const [r, g, b] = getComputedStyle(probe).color.match(/[\d.]+/g)!.map(Number);
      out[value] = { r, g, b };
    }
    probe.remove();
    return out;
  }, values);
}

/** 读取页头当前状态与几何：滑出视口的页头在 Playwright 里依然算“可见”，必须看几何。 */
async function headerState(page: Page) {
  return page.locator('[data-header]').evaluate(element => {
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    // 强调表面是单独的层，用透明度淡入，所以外观要看这一层的 opacity。
    const surface = element.querySelector('[data-header-surface]');
    return {
      state: element.dataset.headerState ?? '',
      top: Math.round(rect.top),
      bottom: Math.round(rect.bottom),
      background: style.backgroundColor,
      surface: surface ? Number(getComputedStyle(surface).opacity) : -1,
      shadow: style.boxShadow,
      transition: style.transitionDuration,
    };
  });
}

/** 读取元素当前位移，用于核对背景视差的位移上限。 */
async function displacement(page: Page, selector: string) {
  return page.locator(selector).first().evaluate(el => {
    const matrix = new DOMMatrixReadOnly(getComputedStyle(el).transform === 'none' ? '' : getComputedStyle(el).transform);
    return { x: matrix.m41, y: matrix.m42, length: Math.hypot(matrix.m41, matrix.m42) };
  });
}

/** 在截图中取一小块像素的中位色，避免噪点与抗锯齿影响采样。 */
function sampleMedian(data: Buffer, info: { width: number; channels: number }, cx: number, cy: number) {
  const reds: number[] = []; const greens: number[] = []; const blues: number[] = [];
  for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
    const i = ((cy + dy) * info.width + (cx + dx)) * info.channels;
    reds.push(data[i]); greens.push(data[i + 1]); blues.push(data[i + 2]);
  }
  const median = (values: number[]) => values.sort((a, b) => a - b)[Math.floor(values.length / 2)];
  return { r: median(reds), g: median(greens), b: median(blues) };
}
function relativeLuminance({ r, g, b }: { r: number; g: number; b: number }) {
  const channel = (value: number) => { const c = value / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}
function contrastRatio(a: { r: number; g: number; b: number }, b: { r: number; g: number; b: number }) {
  const [high, low] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (high + 0.05) / (low + 0.05);
}
const parseColor = (value: string) => { const [r, g, b] = value.match(/[\d.]+/g)!.map(Number); return { r, g, b }; };

test('首页背景由错位叠放的矩形面板构成，文字区域保持平静', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/zh/');
  // 旧的立柱色块、斜向光束与地面分界必须已经移除。
  await expect(page.locator('.architecture, .plane, .light-plane, .floor-plane')).toHaveCount(0);
  const backdrop = page.locator('[data-backdrop="home"]');
  await expect(backdrop).toHaveAttribute('aria-hidden', 'true');
  await expect(backdrop).toHaveCSS('pointer-events', 'none');
  // 三层结构：远层两个大矩形、中层三张卡片、精选后方一块底板。
  await expect(backdrop.locator('[data-depth="far"]')).toHaveCount(2);
  await expect(backdrop.locator('[data-depth="mid"]')).toHaveCount(3);
  await expect(page.locator('.backdrop-plate')).toHaveCount(1);

  for (const [name, width, height] of [['desktop', 1440, 1000], ['tablet', 768, 1024], ['mobile', 390, 844]] as const) {
    await page.setViewportSize({ width, height });
    await page.goto('/zh/');
    const report = await page.evaluate(() => {
      const rect = (el: Element | null) => { if (!el) return null; const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height, right: r.right, bottom: r.bottom }; };
      const visible = (el: Element) => (el as HTMLElement).offsetWidth > 0;
      const hero = rect(document.querySelector('.hero'))!;
      // 底板跟随精选卡片定位，位于背景容器之外，与容器内的面板一起计入层次。
      const layers = [...document.querySelectorAll('.hero [data-depth]')].filter(visible).map(el => ({ depth: (el as HTMLElement).dataset.depth!, ...rect(el)! }));
      const panels = [...document.querySelectorAll('[data-backdrop="home"] .backdrop-panel')].filter(visible).map(el => rect(el)!);
      const far = layers.filter(p => p.depth === 'far');
      const mid = layers.filter(p => p.depth === 'mid' && p.w < hero.w * 0.5);
      const plate = rect(document.querySelector('.backdrop-plate'))!;
      const card = rect(document.querySelector('.hero .featured-card'))!;
      const overlap = (a: typeof hero, b: typeof hero) => Math.max(0, Math.min(a.right, b.right) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.y, b.y));
      // 真实的文字行盒，而不是元素盒子，避免把留白算作文字区域。
      const textBoxes = ['.hero-kicker', '.hero h1', '.hero-subtitle', '.hero-description', '.hero .primary-link']
        .flatMap(selector => { const el = document.querySelector(selector); if (!el) return []; const range = document.createRange(); range.selectNodeContents(el); return [...range.getClientRects()].map(r => ({ x: r.x, y: r.y, w: r.width, h: r.height, right: r.right, bottom: r.bottom })); });
      return {
        layers: layers.length,
        heroWidth: hero.w,
        farClipped: far.some(p => p.right > hero.right + 1 || p.x < hero.x - 1 || p.bottom > hero.bottom + 1),
        midOverlaps: mid.slice(1).map((panel, index) => overlap(panel, mid[index])),
        midLeftMost: Math.min(...mid.map(p => p.x)),
        widestPanel: Math.max(...panels.map(p => p.w)) / hero.w,
        tallestPanel: Math.max(...panels.map(p => p.h)) / hero.h,
        textCollisions: mid.flatMap(p => textBoxes.filter(t => overlap(t, p) > 1)).length,
        plateRight: plate.right - card.right,
        plateTop: card.y - plate.y,
        plateBehindCard: plate.right > card.right && plate.y < card.y && plate.bottom > card.bottom,
        overflow: document.documentElement.scrollWidth - innerWidth,
      };
    });
    // 每个断点都必须保留前景层次和精选底板，也不能让几何压到文字行盒上。
    expect(report.textCollisions, `${name} 文字区域与中层面板重叠`).toBe(0);
    expect(report.plateBehindCard, `${name} 精选底板错位`).toBe(true);
    expect(report.plateRight, `${name} 底板右侧露出`).toBeGreaterThanOrEqual(12);
    expect(report.plateTop, `${name} 底板上侧露出`).toBeGreaterThanOrEqual(12);
    expect(report.overflow, `${name} 页面溢出`).toBeLessThanOrEqual(1);
    expect(report.farClipped, `${name} 远层几何未超出容器裁切`).toBe(true);
    expect(report.widestPanel, `${name} 面板过宽`).toBeLessThan(0.6);
    expect(report.tallestPanel, `${name} 面板过高`).toBeLessThan(0.85);
    if (name === 'mobile') {
      // 手机只保留两块局部裁切的背景面板和精选底板。
      expect(report.layers).toBe(3);
    } else {
      expect(report.layers).toBe(6);
      // 中层面板之间必须形成可辨认的遮挡，并且都留在右侧主要展示区。
      expect(report.midOverlaps.every(area => area > 2000), `${name} 中层面板没有叠放遮挡`).toBe(true);
      expect(report.midLeftMost).toBeGreaterThan(report.heroWidth * 0.6);
    }
  }
});

test('背景动效遵守位移上限，前景内容稳定，指针离开后归位', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/zh/');
  await page.mouse.move(1435, 510);
  await page.waitForTimeout(450);
  const far = await displacement(page, '[data-depth="far"]');
  const mid = await displacement(page, '[data-depth="mid"]');
  expect(far.length).toBeGreaterThan(2);
  // 远层 8px、中层 16px，且两层相加后仍不超过整体上限。
  expect(far.length).toBeLessThanOrEqual(8.2);
  expect(mid.length).toBeLessThanOrEqual(16.2);
  // 前景内容面板不参与变换。
  expect(await page.locator('.hero-panel').evaluate(el => getComputedStyle(el).transform)).toBe('none');
  expect(await page.locator('.prose, .journal-section').first().evaluate(el => getComputedStyle(el).transform)).toBe('none');
  // 快速连续移动后仍然在限额内。
  for (const [x, y] of [[20, 900], [1400, 120], [30, 130], [1420, 880], [700, 500]]) await page.mouse.move(x, y);
  await page.waitForTimeout(450);
  expect((await displacement(page, '[data-depth="far"]')).length).toBeLessThanOrEqual(8.2);
  expect((await displacement(page, '[data-depth="mid"]')).length).toBeLessThanOrEqual(16.2);
  // 指针离开区域后回到静止位置。
  await page.evaluate(() => document.documentElement.dispatchEvent(new PointerEvent('pointerleave')));
  await page.waitForTimeout(600);
  expect((await displacement(page, '[data-depth="mid"]')).length).toBeLessThan(0.5);
  // 入场只播放一次，没有持续漂浮、旋转或循环缩放。
  expect(await page.evaluate(() => document.getAnimations().filter(animation => animation.playState === 'running').length)).toBe(0);
});

test('减少动效直接呈现静态构图，深色模式逐层配置背景', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/zh/');
  const light = await page.evaluate(() => ({
    animationNames: [...document.querySelectorAll('.backdrop-enter')].map(el => getComputedStyle(el).animationName),
    opacities: [...document.querySelectorAll('[data-backdrop="home"] .backdrop-panel')].map(el => getComputedStyle(el).opacity),
    fills: [...document.querySelectorAll('[data-backdrop="home"] .backdrop-panel')].map(el => getComputedStyle(el).backgroundColor),
    base: getComputedStyle(document.querySelector('.hero')!).backgroundImage,
    filter: getComputedStyle(document.querySelector('[data-backdrop="home"]')!).filter,
  }));
  expect(light.animationNames.every(name => name === 'none')).toBe(true);
  expect(light.opacities.every(opacity => opacity === '1')).toBe(true);
  expect(new Set(light.fills).size).toBeGreaterThanOrEqual(4);
  await setTheme(page, 'zh', 'dark');
  const dark = await page.evaluate(() => ({
    fills: [...document.querySelectorAll('[data-backdrop="home"] .backdrop-panel')].map(el => getComputedStyle(el).backgroundColor),
    base: getComputedStyle(document.querySelector('.hero')!).backgroundImage,
    filter: getComputedStyle(document.querySelector('[data-backdrop="home"]')!).filter,
    shadows: [...document.querySelectorAll('[data-backdrop="home"] .backdrop-panel')].map(el => getComputedStyle(el).boxShadow),
  }));
  // 深色不是给整块背景统一降低亮度，而是逐层重新配置，也没有滤镜。
  expect(dark.filter).toBe('none');
  expect(dark.base).not.toBe(light.base);
  expect(new Set(dark.fills).size).toBeGreaterThanOrEqual(4);
  expect(dark.fills).not.toEqual(light.fills);
  expect(dark.shadows.every(shadow => shadow !== 'none')).toBe(true);
});

test('背景层次在真实像素上可辨认，且文字下方没有明显交界', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/zh/');
  await page.waitForTimeout(1200);
  const geometry = await page.evaluate(() => {
    const rect = (selector: string) => { const el = document.querySelector(selector); if (!el) return null; const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height, right: r.right, bottom: r.bottom }; };
    return {
      mid: [...document.querySelectorAll('[data-depth="mid"]')].map(el => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height, right: r.right, bottom: r.bottom }; }),
      panel: rect('.hero-panel')!, h1: rect('.hero h1')!, description: rect('.hero-description')!, cta: rect('.hero .primary-link')!,
      h1Color: getComputedStyle(document.querySelector('.hero h1')!).color,
      hero: rect('.hero')!,
    };
  });
  const shot = await page.screenshot({ animations: 'disabled' });
  const { data, info } = await sharp(shot).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const lumaAt = (x: number, y: number) => { const i = (Math.round(y) * info.width + Math.round(x)) * info.channels; return 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]; };
  const bandDelta = (x0: number, x1: number, y: number) => { const values: number[] = []; for (let x = x0; x <= x1; x += 2) values.push(lumaAt(x, y)); return Math.max(...values) - Math.min(...values); };
  const regionSpread = (x0: number, y0: number, x1: number, y1: number) => {
    const values: number[] = []; for (let y = y0; y <= y1; y += 3) for (let x = x0; x <= x1; x += 3) values.push(lumaAt(x, y));
    const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
    return Math.sqrt(values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length);
  };
  // 相邻面板之间要能看出层次差异，而不是一整块模糊的蓝色装饰。
  const midOne = geometry.mid[0]; const midTwo = geometry.mid[1];
  const insideOne = sampleMedian(data, info, Math.round(midOne.x + midOne.w / 2), Math.round(midOne.y + midOne.h / 2));
  const besideOne = sampleMedian(data, info, Math.round(midOne.right + 24), Math.round(midOne.y + midOne.h / 2));
  const insideTwo = sampleMedian(data, info, Math.round(midTwo.x + midTwo.w / 2), Math.round(midTwo.y + midTwo.h / 2));
  const steps = [Math.abs(relativeLuminance(insideOne) - relativeLuminance(besideOne)), Math.abs(relativeLuminance(insideOne) - relativeLuminance(insideTwo))];
  expect(Math.min(...steps)).toBeGreaterThan(0.005);
  expect(regionSpread(760, 120, 1436, 700)).toBeGreaterThan(4);
  // 文字下方的带状区域保持平静，没有贯穿的几何交界。
  expect(bandDelta(geometry.panel.x + 56, geometry.h1.right - 4, geometry.h1.bottom + 14)).toBeLessThan(12);
  expect(bandDelta(geometry.description.x, geometry.description.right - 4, (geometry.description.bottom + geometry.cta.y) / 2)).toBeLessThan(12);
  // 标题在面板上的对比度足够。
  const panelBackground = sampleMedian(data, info, Math.round(geometry.h1.right - 60), Math.round(geometry.h1.bottom + 14));
  expect(contrastRatio(parseColor(geometry.h1Color), panelBackground)).toBeGreaterThan(7);
});

test('内页与简化变体只保留底色，不残留装饰面板和线条', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/zh/posts/static-by-design/');
  const backdrop = page.locator('[data-backdrop="page"]');
  await expect(backdrop).toHaveCount(1);
  await expect(backdrop).toHaveCSS('position', 'fixed');
  await expect(backdrop).toHaveAttribute('aria-hidden', 'true');
  await expect(backdrop.locator('*')).toHaveCount(0);
  for (const route of ['/zh/archive/', '/zh/about/', '/en/about/', '/zh/types/', '/zh/tags/', '/zh/search/', '/zh/not-a-real-page/']) {
    await page.goto(route);
    const background = page.locator('[data-backdrop]');
    await expect(background).toHaveCount(1);
    await expect(background.locator('*')).toHaveCount(0);
    await expect(background).toHaveCSS('pointer-events', 'none');
  }
  await page.goto('/zh/page/2/');
  await expect(page.locator('[data-backdrop="home"], [data-backdrop="minimal"]')).toHaveCount(0);
  await expect(page.locator('[data-backdrop="page"]')).toHaveCount(1);
});

test('手机减少叠层并关闭指针视差，保留精选底板', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/zh/');
  const visiblePanels = await page.evaluate(() => [...document.querySelectorAll('[data-backdrop="home"] [data-depth]')].filter(el => (el as HTMLElement).offsetWidth > 0).length);
  // 手机只保留两张局部裁切的背景面板和精选底板，关闭鼠标端的视差。
  expect(visiblePanels).toBe(2);
  await expect(page.locator('.backdrop-plate')).toHaveCount(1);
  await page.mouse.move(380, 400);
  await page.waitForTimeout(400);
  expect(await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('[data-depth]')].every(el => el.style.transform === ''))).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
});

test('保存背景层次的截图证据', async ({ page }, testInfo) => {
  for (const [name, width, height] of [['desktop', 1440, 1000], ['tablet', 768, 1024], ['mobile', 390, 844]] as const) {
    await page.setViewportSize({ width, height });
    await page.goto('/zh/');
    await page.waitForTimeout(1100);
    await page.screenshot({ path: testInfo.outputPath(`backdrop-${name}.png`), animations: 'disabled' });
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/zh/');
  await setTheme(page, 'zh', 'dark');
  await page.waitForTimeout(1100);
  await page.screenshot({ path: testInfo.outputPath('backdrop-dark.png'), animations: 'disabled' });
  await page.goto('/zh/posts/static-by-design/');
  await page.waitForTimeout(1100);
  await page.screenshot({ path: testInfo.outputPath('backdrop-page.png'), animations: 'disabled' });
});

test('自建模态层：焦点循环、背景不可操作、滚动锁定与焦点恢复', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/zh/posts/blue-hour/');
  const opener = page.getByRole('button', { name: 'English translation unavailable' });
  const modal = page.locator('#translation-modal');
  await opener.click();
  await expect(modal).toBeVisible();
  // 背景不可操作且滚动被锁定。
  await expect(page.locator('#page-shell')).toHaveAttribute('inert', '');
  await expect(page.locator('body')).toHaveAttribute('data-scroll-locked', '');
  // 焦点进入模态层。
  expect(await page.evaluate(() => document.getElementById('translation-modal')!.contains(document.activeElement))).toBe(true);
  // Tab 在模态层内循环，不会跑到背景内容。
  const count = await page.locator('#translation-modal a[href], #translation-modal button').count();
  for (let i = 0; i < count + 2; i += 1) {
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => document.getElementById('translation-modal')!.contains(document.activeElement)), `第 ${i + 1} 次 Tab 后焦点仍在模态层内`).toBe(true);
  }
  // Escape 关闭，背景恢复，焦点与滚动位置都回到原处。
  await page.keyboard.press('Escape');
  await expect(modal).toBeHidden();
  await expect(page.locator('#page-shell')).not.toHaveAttribute('inert', '');
  await expect(page.locator('body')).not.toHaveAttribute('data-scroll-locked', '');
  await expect(opener).toBeFocused();

  // 滚动恢复：用脚本触发打开，避免测试驱动器为了把吸顶头部控件滚入视口而改变滚动位置。
  await page.evaluate(() => scrollTo({ top: 600, behavior: 'instant' }));
  const scrollBefore = await page.evaluate(() => scrollY);
  await page.evaluate(() => document.querySelector<HTMLElement>('[data-modal-button="translation-modal"]')?.click());
  await expect(modal).toBeVisible();
  await expect(page.locator('body')).toHaveAttribute('data-scroll-locked', '');
  await page.keyboard.press('Escape');
  await expect(modal).toBeHidden();
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(scrollBefore);
});

test('模态层快速重复打开与关闭不叠加状态', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/zh/posts/blue-hour/');
  const opener = page.getByRole('button', { name: 'English translation unavailable' });
  for (let i = 0; i < 3; i += 1) {
    await opener.click();
    await page.waitForTimeout(40);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(60);
  }
  await page.waitForTimeout(300);
  await expect(page.locator('#translation-modal')).toBeHidden();
  await expect(page.locator('#page-shell')).not.toHaveAttribute('inert', '');
  await opener.click();
  await expect(page.locator('#translation-modal')).toBeVisible();
  await expect(page.locator('#page-shell')).toHaveAttribute('inert', '');
});

test('同一时间只打开一个模态层，关闭后背景恢复', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/zh/posts/blue-hour/');
  await page.getByRole('button', { name: '菜单', exact: true }).click();
  await expect(page.locator('#mobile-nav')).toBeVisible();
  await expect(page.locator('[data-modal]:not([hidden])')).toHaveCount(1);
  await page.keyboard.press('Escape');
  await expect(page.locator('#mobile-nav')).toBeHidden();
  await page.getByRole('button', { name: 'English translation unavailable' }).click();
  await expect(page.locator('#translation-modal')).toBeVisible();
  await expect(page.locator('#mobile-nav')).toBeHidden();
  await expect(page.locator('[data-modal]:not([hidden])')).toHaveCount(1);
});

test('标签浮层：按钮触发，方向键、外部点击与 Escape 都能关闭', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/zh/');
  const trigger = page.getByRole('button', { name: '标签', exact: true });
  const panel = page.locator('#tag-filter-panel');
  await trigger.click();
  await expect(panel).toBeVisible();
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  await expect(trigger).toHaveAttribute('aria-haspopup', 'true');
  // 方向键在链接之间移动焦点。
  await page.keyboard.press('ArrowDown');
  expect(await page.evaluate(() => document.getElementById('tag-filter-panel')!.contains(document.activeElement))).toBe(true);
  // 点击浮层之外关闭。
  await page.locator('.hero-description').click();
  await expect(panel).toBeHidden();
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  // Escape 关闭并把焦点送回触发按钮。
  await trigger.click();
  await expect(panel).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(panel).toBeHidden();
  await expect(trigger).toBeFocused();
});

test('移动目录使用自定义展开区域，桌面保持侧栏目录', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/zh/posts/static-by-design/');
  await expect(page.locator('.toc a').first()).toBeVisible();
  await expect(page.locator('details, summary, dialog')).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  const trigger = page.locator('[data-disclosure-trigger]').first();
  const region = page.locator('[data-disclosure-region]').first();
  const outlineLink = page.locator('[data-disclosure-region] .toc a').first();
  await expect(trigger).toBeVisible();
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await expect(region).toHaveAttribute('data-state', 'closed');
  // 关闭状态的高度收敛到 0，展开后重新给出内容高度。
  await expect.poll(() => region.evaluate(el => el.getBoundingClientRect().height)).toBeLessThan(4);
  await trigger.click();
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  await expect(region).toHaveAttribute('data-state', 'open');
  await expect(outlineLink).toBeVisible();
  await expect.poll(() => region.evaluate(el => el.getBoundingClientRect().height)).toBeGreaterThan(60);
  await trigger.click();
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await expect.poll(() => region.evaluate(el => el.getBoundingClientRect().height)).toBeLessThan(4);
});

test('保存组件与页面截图证据', async ({ page }, testInfo) => {
  test.setTimeout(150000);
  await page.setViewportSize({ width: 1440, height: 1000 });
  const shot = async (name: string, url: string) => {
    await page.goto(url);
    await page.waitForTimeout(900);
    await page.screenshot({ path: testInfo.outputPath(`${name}.png`), fullPage: true, animations: 'disabled' });
  };
  await shot('page-archive', '/zh/archive/');
  await shot('page-taxonomy', '/zh/tags/');
  await shot('page-article', '/zh/posts/static-by-design/');
  await shot('page-about', '/zh/about/');
  await shot('page-404', '/zh/not-a-real-page/');

  // 页头与主题设置：桌面、手机与深色三种状态。
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/zh/');
  await page.locator('.site-header').screenshot({ path: testInfo.outputPath('header-theme.png'), animations: 'disabled' });
  await setTheme(page, 'zh', 'dark');
  await page.locator('.site-header').screenshot({ path: testInfo.outputPath('header-theme-dark.png'), animations: 'disabled' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/zh/');
  await page.locator('.site-header').screenshot({ path: testInfo.outputPath('header-theme-mobile.png'), animations: 'disabled' });

  // 页头滚动三态：贴顶、向下阅读时隐藏、向上滚动时滑出。
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/zh/');
  await page.waitForTimeout(900);
  await page.screenshot({ path: testInfo.outputPath('header-scroll-top.png'), animations: 'disabled' });
  await page.evaluate(() => scrollTo({ top: 900, behavior: 'instant' }));
  await page.waitForTimeout(500);
  await page.screenshot({ path: testInfo.outputPath('header-scroll-hidden.png'), animations: 'disabled' });
  await page.evaluate(() => scrollTo({ top: 780, behavior: 'instant' }));
  await page.waitForTimeout(500);
  await page.screenshot({ path: testInfo.outputPath('header-scroll-pinned.png'), animations: 'disabled' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/zh/');
  await page.waitForTimeout(900);
  await page.screenshot({ path: testInfo.outputPath('header-scroll-mobile-top.png'), animations: 'disabled' });
  await page.evaluate(() => scrollTo({ top: 700, behavior: 'instant' }));
  await page.waitForTimeout(500);
  await page.screenshot({ path: testInfo.outputPath('header-scroll-mobile-hidden.png'), animations: 'disabled' });
  await setTheme(page, 'zh', 'dark');
  await page.evaluate(() => scrollTo({ top: 500, behavior: 'instant' }));
  await page.waitForTimeout(500);
  await page.screenshot({ path: testInfo.outputPath('header-scroll-dark-pinned.png'), animations: 'disabled' });

  // 搜索：输入后等待真实索引返回结果再截图。
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/zh/search/');
  await page.getByRole('searchbox').fill('构建');
  await expect(page.locator('.search-result').first()).toBeVisible({ timeout: 15000 });
  await page.screenshot({ path: testInfo.outputPath('page-search.png'), fullPage: true, animations: 'disabled' });

  // 浮层：标签筛选。
  await page.goto('/zh/');
  await page.getByRole('button', { name: '标签', exact: true }).click();
  await expect(page.locator('#tag-filter-panel')).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('overlay-popover.png'), animations: 'disabled' });

  // 模态层：译文提示与图片查看。
  await page.goto('/zh/posts/blue-hour/');
  await page.getByRole('button', { name: 'English translation unavailable' }).click();
  await expect(page.locator('#translation-modal')).toBeVisible();
  await page.waitForTimeout(400);
  await page.screenshot({ path: testInfo.outputPath('overlay-translation.png'), animations: 'disabled' });
  await page.keyboard.press('Escape');
  await expect(page.locator('#translation-modal')).toBeHidden();
  await page.goto('/zh/posts/light-and-space/');
  await page.locator('.prose img').first().click();
  await expect(page.locator('#lightbox')).toBeVisible();
  await page.waitForTimeout(400);
  await page.screenshot({ path: testInfo.outputPath('overlay-lightbox.png'), animations: 'disabled' });

  // 移动导航与深色主题。
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/zh/');
  await page.getByRole('button', { name: '菜单', exact: true }).click();
  await expect(page.locator('#mobile-nav')).toBeVisible();
  await page.waitForTimeout(400);
  await page.screenshot({ path: testInfo.outputPath('overlay-mobilenav.png'), animations: 'disabled' });
  await page.keyboard.press('Escape');
  await expect(page.locator('#mobile-nav')).toBeHidden();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await setTheme(page, 'zh', 'dark');
  for (const [name, url] of [['dark-archive', '/zh/archive/'], ['dark-search', '/zh/search/'], ['dark-article', '/zh/posts/static-by-design/']] as const) {
    await shot(name, url);
  }
});

test('录制指针视差、入场与交互反馈', async ({ browser }, testInfo) => {
  test.setTimeout(150000);
  const context = await browser.newContext({ viewport: { width: 1280, height: 860 }, recordVideo: { dir: 'test-results/backdrop-video', size: { width: 1280, height: 860 } } });
  const page = await context.newPage();
  // 入场动效与指针视差。
  await page.goto('http://127.0.0.1:4329/zh/');
  await page.waitForTimeout(1400);
  for (const [x, y] of [[120, 200], [1160, 220], [1180, 760], [140, 780], [640, 430], [1180, 300]]) { await page.mouse.move(x, y); await page.waitForTimeout(380); }
  await page.evaluate(() => document.documentElement.dispatchEvent(new PointerEvent('pointerleave')));
  await page.waitForTimeout(700);
  // 页头滚动：向下阅读时隐藏，向上滚动时滑出。
  await page.evaluate(() => scrollTo({ top: 1000, behavior: 'smooth' }));
  await page.waitForTimeout(1300);
  await page.evaluate(() => scrollTo({ top: 700, behavior: 'smooth' }));
  await page.waitForTimeout(1300);
  await page.evaluate(() => scrollTo({ top: 0, behavior: 'smooth' }));
  await page.waitForTimeout(1000);
  // 卡片悬停与浮层反馈。
  await page.locator('.entry-list .entry-card').first().hover();
  await page.waitForTimeout(500);
  await page.getByRole('button', { name: '标签', exact: true }).click();
  await page.waitForTimeout(700);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
  // 模态层的打开、焦点循环与关闭。
  await page.goto('http://127.0.0.1:4329/zh/posts/blue-hour/');
  await page.getByRole('button', { name: 'English translation unavailable' }).click();
  await page.waitForTimeout(700);
  await page.keyboard.press('Tab');
  await page.waitForTimeout(500);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(700);
  // 主题切换后软导航：页面不整体刷新，主题与页头控件保持。
  await page.goto('http://127.0.0.1:4329/zh/');
  await setTheme(page, 'zh', 'dark');
  await page.waitForTimeout(600);
  await page.getByRole('link', { name: '归档', exact: true }).first().click();
  await page.waitForTimeout(1200);
  await page.getByRole('link', { name: '全部内容', exact: true }).first().click();
  await page.waitForTimeout(1200);
  const video = await page.video()?.path();
  await context.close();
  expect(video).toBeTruthy();
  if (video) await testInfo.attach('ui-motion', { path: video, contentType: 'video/webm' });
});

test('软导航不整页刷新，URL 与标题更新', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/zh/');
  // 整页刷新会丢掉 window 上的标记；标记存活即可证明是软导航。
  await page.evaluate(() => { (window as unknown as Record<string, unknown>).softNavMarker = 'alive'; });
  await page.locator('.entry-list h2 a').first().click();
  await page.waitForURL(/\/zh\/posts\//);
  await expect(page.locator('#article-body')).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as Record<string, unknown>).softNavMarker)).toBe('alive');
  // 后退同样走软导航，并回到原来的列表。
  await page.goBack();
  await expect(page.locator('.entry-list .entry-card').first()).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as Record<string, unknown>).softNavMarker)).toBe('alive');
  expect(await page.evaluate(() => document.documentElement.dataset.navigation)).toBe('soft');
});

test('主题设置跨软导航保持，并在绘制前就已应用', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/zh/');
  await setTheme(page, 'zh', 'dark');
  // 记录每次交换完成时的根属性：after-swap 早于绘制，值正确即说明不会闪回默认主题。
  await page.evaluate(() => {
    (window as unknown as Record<string, unknown>).themeAtSwap = [] as unknown[];
    document.addEventListener('astro:after-swap', () => {
      const root = document.documentElement;
      (window as unknown as Record<string, unknown[]>).themeAtSwap.push([root.dataset.theme, root.dataset.resolvedTheme, root.classList.contains('js')]);
    });
  });
  await page.getByRole('link', { name: '归档', exact: true }).first().click();
  await page.waitForURL('**/zh/archive/');
  await expect(page.locator('.archive-group').first()).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as Record<string, unknown[]>).themeAtSwap)).toEqual([['dark', 'dark', true]]);
  // 新页面的根属性与页头控件都已经同步。
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('html')).toHaveAttribute('data-resolved-theme', 'dark');
  await expectThemeControl(page, '深色', true);
  expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe('rgb(16, 26, 36)');
  // 页面内再切回浅色，下一次导航同样保持。
  await setTheme(page, 'zh', 'light');
  await page.getByRole('link', { name: '类型', exact: true }).first().click();
  await page.waitForURL('**/zh/types/');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expectThemeControl(page, '浅色', true);
});

test('软导航后交互仍然可用，且不重复绑定', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/zh/');
  // 多次来回导航，覆盖模块脚本不会重复执行的路径（页头词标指向 /zh/）。
  const home = page.locator('.site-header a[href="/zh/"]');
  await page.getByRole('link', { name: '归档', exact: true }).first().click();
  await page.waitForURL('**/zh/archive/');
  await expect(page.locator('.archive-group').first()).toBeVisible();
  await home.click();
  await page.waitForURL('**/zh/');
  await expect(page.locator('.entry-list .entry-card').first()).toBeVisible();
  try { await home.click(); } catch { /* 已经在首页时词标导航可能不触发新导航。 */ }
  // 代码复制按钮只增强一次；先筛到带代码块的学习笔记再进详情。
  await page.getByRole('link', { name: '学习笔记', exact: true }).first().click();
  await page.waitForURL('**/zh/types/note/');
  await page.locator('.entry-list h2 a').first().click();
  await page.waitForURL(/\/zh\/posts\//);
  await expect(page.locator('.prose pre')).toHaveCount(1);
  await expect(page.locator('.prose pre button')).toHaveCount(1);
  // 目录观察器、主题控件、模态层都仍然工作。
  await page.locator('.toc a').first().click();
  await expect(page).toHaveURL(/#/);
  await expectThemeControl(page, '跟随系统', true);
  await page.getByRole('link', { name: '全部内容', exact: true }).first().click();
  await expect(page).toHaveURL(/\/zh\/#journal$/);
  await page.getByRole('button', { name: '标签', exact: true }).click();
  await expect(page.locator('#tag-filter-panel')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#tag-filter-panel')).toBeHidden();
});

test('搜索页在重复访问后仍然工作', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/zh/search/');
  await page.getByRole('searchbox').fill('构建');
  await expect(page.locator('.search-result').first()).toBeVisible({ timeout: 15000 });
  // 离开再回来：搜索页脚本只在首次进入时执行，接线必须由 astro:page-load 负责。
  await page.locator('.site-header a[href="/zh/"]').click();
  await page.waitForURL('**/zh/');
  await page.getByRole('link', { name: '搜索', exact: true }).first().click();
  await page.waitForURL('**/zh/search/');
  await page.getByRole('searchbox').fill('光影');
  await expect(page.locator('.search-result').first()).toBeVisible({ timeout: 15000 });
  await expect(page.locator('#search-status')).toContainText('结果');
});

test('模态层打开时导航不会把 inert 与滚动锁带到新页面', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/zh/');
  await page.getByRole('button', { name: '菜单', exact: true }).click();
  await expect(page.locator('#mobile-nav')).toBeVisible();
  await page.getByRole('link', { name: '归档', exact: true }).click();
  await page.waitForURL('**/zh/archive/');
  await expect(page.locator('.archive-group').first()).toBeVisible();
  await expect(page.locator('#page-shell')).not.toHaveAttribute('inert', '');
  await expect(page.locator('body')).not.toHaveAttribute('data-scroll-locked', '');
  await expect(page.locator('[data-modal]:not([hidden])')).toHaveCount(0);
  // 新页面上的模态层由同一套委托继续工作。
  await page.getByRole('button', { name: '菜单', exact: true }).click();
  await expect(page.locator('#mobile-nav')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#mobile-nav')).toBeHidden();
});

test('非 HTML 链接交给浏览器整页处理', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/zh/');
  const rss = page.locator('footer a[href$=".xml"]').first();
  await expect(rss).toHaveAttribute('data-astro-reload', '');
});

test('页头随滚动隐藏，向上滚动或回到顶部时滑出', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/zh/');
  const header = page.locator('[data-header]');
  await expect(header).toHaveAttribute('data-header-state', 'top');
  const top = await headerState(page);
  expect(top.top).toBe(0);
  expect(top.surface).toBeLessThan(0.05);
  // 隐藏前后内容位置不变：页头隐藏不产生布局跳动。
  const offset = () => page.evaluate(() => Math.round(document.querySelector('.journal-section')!.getBoundingClientRect().top + scrollY));
  const before = await offset();
  await page.evaluate(() => scrollTo({ top: 900, behavior: 'instant' }));
  await expect(header).toHaveAttribute('data-header-state', 'hidden');
  // 背景与阴影有 300ms 过渡，等它落定再采样计算样式。
  await page.waitForTimeout(450);
  const hidden = await headerState(page);
  expect(hidden.bottom).toBeLessThanOrEqual(0);
  expect(await offset()).toBe(before);
  // 向上滚动一小段就滑出，并切换为强调外观。
  await page.evaluate(() => scrollTo({ top: 820, behavior: 'instant' }));
  await expect(header).toHaveAttribute('data-header-state', 'pinned');
  await page.waitForTimeout(450);
  const pinned = await headerState(page);
  expect(pinned.top).toBe(0);
  // 强调外观来自单独一层的淡入：透明度接近 1，并带阴影。
  expect(pinned.surface).toBeGreaterThan(0.95);
  const surfaceShadow = await page.locator('[data-header-surface]').evaluate(el => getComputedStyle(el).boxShadow);
  expect(surfaceShadow).not.toBe('none');
  // 回到顶部恢复普通贴顶状态。
  await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
  await expect(header).toHaveAttribute('data-header-state', 'top');
  await page.waitForTimeout(600);
  expect((await headerState(page)).surface).toBeLessThan(0.05);
});

test('页头隐藏时键盘聚焦会自动显现', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/zh/');
  const header = page.locator('[data-header]');
  await page.evaluate(() => scrollTo({ top: 900, behavior: 'instant' }));
  await expect(header).toHaveAttribute('data-header-state', 'hidden');
  // 隐藏状态不把导航移出 Tab 顺序：聚焦即滑出。
  await page.locator('[data-header] a').first().focus();
  await expect(header).toHaveAttribute('data-header-state', 'pinned');
  expect((await headerState(page)).bottom).toBeGreaterThan(0);
});

test('减少动效下页头状态瞬时切换', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/zh/');
  await page.evaluate(() => scrollTo({ top: 900, behavior: 'instant' }));
  await expect(page.locator('[data-header]')).toHaveAttribute('data-header-state', 'hidden');
  expect((await headerState(page)).transition).toBe('0s');
  await page.evaluate(() => scrollTo({ top: 700, behavior: 'instant' }));
  await expect(page.locator('[data-header]')).toHaveAttribute('data-header-state', 'pinned');
});

test('软导航后页头状态复位并继续工作', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/zh/');
  const header = page.locator('[data-header]');
  await page.evaluate(() => scrollTo({ top: 900, behavior: 'instant' }));
  await expect(header).toHaveAttribute('data-header-state', 'hidden');
  // 页头隐藏时从内容区软导航到新页面。
  await page.locator('.entry-list h2 a').first().click();
  await page.waitForURL(/\/zh\/posts\//);
  await expect(page.locator('#article-body')).toBeVisible();
  await expect(header).toHaveAttribute('data-header-state', 'top');
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--header-h').trim())).toBe('84px');
  // 新页面上仍然可以隐藏与显现。
  await page.evaluate(() => scrollTo({ top: 900, behavior: 'instant' }));
  await expect(header).toHaveAttribute('data-header-state', 'hidden');
  await page.evaluate(() => scrollTo({ top: 700, behavior: 'instant' }));
  await expect(header).toHaveAttribute('data-header-state', 'pinned');
});

test('锚点跳转不会被已显现的页头遮挡', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/zh/posts/static-by-design/');
  const links = page.locator('.toc a');
  expect(await links.count()).toBeGreaterThan(2);
  // 先跳到靠后的章节，再回到第一个：向上滚动会显现页头，目标不能被压在页头下面。
  await links.nth(2).click();
  await page.waitForTimeout(900);
  await links.first().click();
  await page.waitForTimeout(1000);
  const gap = await page.evaluate(() => {
    const heading = document.getElementById(decodeURIComponent(location.hash.slice(1)));
    const header = document.querySelector('[data-header]');
    if (!heading || !header) return -999;
    return Math.round(heading.getBoundingClientRect().top - header.getBoundingClientRect().bottom);
  });
  expect(gap).toBeGreaterThanOrEqual(0);
});

test('页头状态切换是连续动画而不是瞬间跳变', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/zh/');
  const header = page.locator('[data-header]');
  const height = await header.evaluate(el => el.getBoundingClientRect().height);
  // 采样页头在视口中的位置：是否经过中间值可以区分动画与瞬间跳变。
  const samples = async (ms: number) => {
    const values: number[] = [];
    const started = Date.now();
    while (Date.now() - started < ms) {
      values.push(await header.evaluate(el => el.getBoundingClientRect().top));
      await page.waitForTimeout(24);
    }
    return values;
  };
  await page.evaluate(() => scrollTo({ top: 900, behavior: 'instant' }));
  const hiding = await samples(420);
  expect(hiding.filter(value => value < -2 && value > -height + 2).length).toBeGreaterThanOrEqual(3);
  await expect(header).toHaveAttribute('data-header-state', 'hidden');
  await page.evaluate(() => scrollTo({ top: 780, behavior: 'instant' }));
  const revealing = await samples(560);
  expect(revealing.filter(value => value > -height + 2 && value < -2).length).toBeGreaterThanOrEqual(2);
  // 贴顶时轻微回弹后稳定，避免“硬着陆”。
  expect(Math.max(...revealing)).toBeGreaterThan(0.3);
  expect(revealing.at(-1) ?? -99).toBeLessThan(1);
  await expect(header).toHaveAttribute('data-header-state', 'pinned');
  expect(Math.round((await headerState(page)).top)).toBe(0);
  // 出快进慢：两个方向的过渡参数不同。
  const timings = await page.evaluate(() => {
    const element = document.querySelector('[data-header]') as HTMLElement;
    const reveal = getComputedStyle(element).transitionDuration;
    element.dataset.headerState = 'hidden';
    const hide = getComputedStyle(element).transitionDuration;
    element.dataset.headerState = 'pinned';
    return { reveal, hide };
  });
  expect(timings.reveal.startsWith('0.42')).toBe(true);
  expect(timings.hide.startsWith('0.26')).toBe(true);
});

test('手动切换主题有一段平顺的过渡', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/zh/');
  await openSettings(page);
  await page.getByRole('radio', { name: '深色', exact: true }).click();
  // 切换期间根元素带短暂的过渡类，随后自动移除，不给全站留下常驻 transition。
  expect(await page.evaluate(() => document.documentElement.classList.contains('theme-anim'))).toBe(true);
  await expect.poll(() => page.evaluate(() => document.documentElement.classList.contains('theme-anim')), { timeout: 3000 }).toBe(false);
  await closeSettings(page);
  await setTheme(page, 'zh', 'system');
});

test('减少动效下不播放主题过渡与页头位移', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/zh/');
  await openSettings(page);
  await page.getByRole('radio', { name: '深色', exact: true }).click();
  expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe('dark');
  expect(await page.evaluate(() => document.documentElement.classList.contains('theme-anim'))).toBe(false);
  expect((await headerState(page)).transition).toBe('0s');
});

test('录制页头六种状态的动效', async ({ browser }, testInfo) => {
  test.setTimeout(300000);
  // 六个场景与 docs/evidence/header-scroll 下的静态截图一一对应，这里补上动画过程。
  const scenarios = [
    { name: 'header-scroll-top', width: 1440, height: 1000, dark: false, motion: 'top' },
    { name: 'header-scroll-hidden', width: 1440, height: 1000, dark: false, motion: 'hidden' },
    { name: 'header-scroll-pinned', width: 1440, height: 1000, dark: false, motion: 'pinned' },
    { name: 'header-scroll-mobile-top', width: 390, height: 844, dark: false, motion: 'top' },
    { name: 'header-scroll-mobile-hidden', width: 390, height: 844, dark: false, motion: 'hidden' },
    { name: 'header-scroll-dark-pinned', width: 1440, height: 1000, dark: true, motion: 'pinned' },
  ] as const;
  for (const scenario of scenarios) {
    const context = await browser.newContext({
      viewport: { width: scenario.width, height: scenario.height },
      recordVideo: { dir: 'test-results/header-motion', size: { width: scenario.width, height: scenario.height } },
    });
    const page = await context.newPage();
    await page.goto('http://127.0.0.1:4329/zh/');
    await page.waitForTimeout(1200);
    if (scenario.dark) { await setTheme(page, 'zh', 'dark'); await page.waitForTimeout(600); }
    const to = (top: number, behavior: 'smooth' | 'instant' = 'smooth') => page.evaluate(([value, mode]) => scrollTo({ top: value, behavior: mode }), [top, behavior] as const);
    if (scenario.motion === 'top') {
      // 展示贴顶状态：先离开顶部再回到顶部，能看到滑出与归位。
      await to(700); await page.waitForTimeout(1100);
      await to(0); await page.waitForTimeout(1100);
    } else if (scenario.motion === 'hidden') {
      await to(900); await page.waitForTimeout(1400);
      await to(1200); await page.waitForTimeout(900);
    } else {
      await to(1000); await page.waitForTimeout(1300);
      await to(760); await page.waitForTimeout(1400);
    }
    const video = await page.video()?.path();
    await context.close();
    expect(video).toBeTruthy();
    if (video) await testInfo.attach(scenario.name, { path: video, contentType: 'video/webm' });
  }
});

test('配色切换生效、持久，并在绘制前写回', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/zh/');
  const root = page.locator('html');
  await expect(root).toHaveAttribute('data-palette', 'slate');
  const slate = await resolveColors(page, ['var(--c-accent)', 'var(--backdrop-mid-1)']);
  await setPalette(page, 'jade');
  const jade = await resolveColors(page, ['var(--c-accent)', 'var(--backdrop-mid-1)']);
  expect(jade['var(--c-accent)']).not.toEqual(slate['var(--c-accent)']);
  expect(jade['var(--backdrop-mid-1)']).not.toEqual(slate['var(--backdrop-mid-1)']);
  // 刷新后保持。
  await page.reload();
  await expect(root).toHaveAttribute('data-palette', 'jade');
  // 软导航时 after-swap 必须已经写回，否则会闪回默认配色。
  await page.evaluate(() => {
    (window as unknown as Record<string, unknown>).paletteAtSwap = [] as unknown[];
    document.addEventListener('astro:after-swap', () => {
      (window as unknown as Record<string, unknown[]>).paletteAtSwap.push(document.documentElement.dataset.palette);
    });
  });
  await page.getByRole('link', { name: '归档', exact: true }).first().click();
  await page.waitForURL('**/zh/archive/');
  expect(await page.evaluate(() => (window as unknown as Record<string, unknown[]>).paletteAtSwap)).toEqual(['jade']);
  await expect(root).toHaveAttribute('data-palette', 'jade');
  // 未知存储值回落默认配色并清理键。
  await page.evaluate(() => localStorage.setItem('palette', 'nope'));
  await page.reload();
  await expect(root).toHaveAttribute('data-palette', 'slate');
  expect(await page.evaluate(() => localStorage.getItem('palette'))).toBe(null);
});

test('五份配色在浅色与深色下都满足文字与强调色的对比度门槛', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  const palettes = ['slate', 'jade', 'violet', 'clay', 'graphite'] as const;
  const thresholds: [string, string, number][] = [
    ['--c-ink', '--c-canvas', 7],
    ['--c-muted', '--c-canvas', 4.5],
    ['--c-faint', '--c-surface', 3],
    ['--c-on-accent', '--c-accent', 4.5],
    ['--c-accent', '--c-accent-soft', 3],
    ['--c-accent', '--c-canvas', 3],
  ];
  for (const mode of ['light', 'dark'] as const) {
    for (const palette of palettes) {
      await page.goto('/zh/');
      await page.evaluate(([m, p]) => {
        localStorage.setItem('theme', m);
        localStorage.setItem('palette', p);
      }, [mode, palette] as const);
      await page.reload();
      await expect(page.locator('html')).toHaveAttribute('data-palette', palette);
      await expect(page.locator('html')).toHaveAttribute('data-resolved-theme', mode);
      const resolved = await resolveColors(page, [...new Set(thresholds.flatMap(([a, b]) => [`var(${a})`, `var(${b})`]))]);
      for (const [foreground, background, minimum] of thresholds) {
        const ratio = contrastRatio(resolved[`var(${foreground})`], resolved[`var(${background})`]);
        expect(ratio, `${palette}/${mode} ${foreground} on ${background} = ${ratio.toFixed(2)}`).toBeGreaterThanOrEqual(minimum);
      }
    }
  }
});

test('默认蓝灰配色与既有取值一致，不产生视觉回归', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/zh/');
  await page.evaluate(() => { localStorage.clear(); });
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-palette', 'slate');
  const light = await resolveColors(page, ['var(--c-canvas)', 'var(--c-accent)', '#eef3f8', '#476282']);
  expect(light['var(--c-canvas)']).toEqual(light['#eef3f8']);
  expect(light['var(--c-accent)']).toEqual(light['#476282']);
  await setTheme(page, 'zh', 'dark');
  const dark = await resolveColors(page, ['var(--c-canvas)', 'var(--c-accent)', '#101a24', '#b2c9e1']);
  expect(dark['var(--c-canvas)']).toEqual(dark['#101a24']);
  expect(dark['var(--c-accent)']).toEqual(dark['#b2c9e1']);
});

test('设置浮层：外观与配色都可用键盘完整操作', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/zh/');
  const trigger = page.locator('[data-header] button[aria-label="外观与配色"]:visible');
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await trigger.click();
  const panel = page.locator('[data-popover-panel]:visible');
  await expect(panel).toBeVisible();
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  // 浮层里同时提供外观分段与配色色板。
  await expect(panel.getByRole('radio', { name: '深色', exact: true })).toBeVisible();
  await expect(panel.locator('[data-palette-option]')).toHaveCount(5);
  await expect(panel.getByRole('radio', { name: '蓝灰', exact: true })).toHaveAttribute('aria-checked', 'true');
  // 色板方向键切换，并同步到根元素。
  await panel.getByRole('radio', { name: '蓝灰', exact: true }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('html')).toHaveAttribute('data-palette', 'jade');
  await page.keyboard.press('End');
  await expect(page.locator('html')).toHaveAttribute('data-palette', 'graphite');
  await page.keyboard.press('Home');
  await expect(page.locator('html')).toHaveAttribute('data-palette', 'slate');
  // Escape 关闭并把焦点送回触发按钮。
  await page.keyboard.press('Escape');
  await expect(panel).toHaveCount(0);
  await expect(trigger).toBeFocused();
  // 外部点击同样关闭。
  await trigger.click();
  await expect(page.locator('[data-popover-panel]:visible')).toBeVisible();
  await page.locator('.hero-description').click();
  await expect(page.locator('[data-popover-panel]:visible')).toHaveCount(0);
});

test('切换配色有平顺过渡，减少动效下瞬时切换', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/zh/');
  await openSettings(page);
  await page.getByRole('radio', { name: '青绿', exact: true }).click();
  expect(await page.evaluate(() => document.documentElement.classList.contains('theme-anim'))).toBe(true);
  await expect.poll(() => page.evaluate(() => document.documentElement.classList.contains('theme-anim')), { timeout: 3000 }).toBe(false);
  await page.keyboard.press('Escape');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openSettings(page);
  await page.getByRole('radio', { name: '紫罗兰', exact: true }).click();
  expect(await page.evaluate(() => document.documentElement.dataset.palette)).toBe('violet');
  expect(await page.evaluate(() => document.documentElement.classList.contains('theme-anim'))).toBe(false);
  await page.keyboard.press('Escape');
});

test('保存配色与设置浮层的截图证据', async ({ browser }, testInfo) => {
  test.setTimeout(180000);
  const palettes = ['slate', 'jade', 'violet', 'clay', 'graphite'] as const;
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, recordVideo: { dir: 'test-results/palette-video', size: { width: 1440, height: 1000 } } });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4329/zh/');
  await page.waitForTimeout(1200);
  for (const mode of ['light', 'dark'] as const) {
    if (mode === 'dark') await setTheme(page, 'zh', 'dark');
    for (const palette of palettes) {
      await setPalette(page, palette);
      await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
      await page.waitForTimeout(450);
      // 只截首屏：能同时看到背景几何、面板与强调色。
      await page.screenshot({ path: testInfo.outputPath(`palette-${palette}-${mode}.png`), animations: 'disabled' });
    }
  }
  // 设置浮层本身：桌面与手机。
  await setTheme(page, 'zh', 'light');
  await setPalette(page, 'slate');
  await openSettings(page);
  await page.waitForTimeout(400);
  await page.screenshot({ path: testInfo.outputPath('settings-popover.png'), animations: 'disabled' });
  await page.keyboard.press('Escape');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('http://127.0.0.1:4329/zh/');
  await page.waitForTimeout(900);
  await openSettings(page);
  await page.waitForTimeout(400);
  await page.screenshot({ path: testInfo.outputPath('settings-popover-mobile.png'), animations: 'disabled' });
  const video = await page.video()?.path();
  await context.close();
  if (video) await testInfo.attach('palette-switch', { path: video, contentType: 'video/webm' });
});

test('设置入口使用色彩板图标，并且颜料点跟随当前配色', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/zh/');
  const trigger = page.locator('[data-header] button[aria-label="外观与配色"]:visible').first();
  // 图标是画板轮廓 + 四个颜料点，颜料点填当前强调色。
  const icon = trigger.locator('svg');
  await expect(icon).toHaveCount(1);
  expect(await icon.locator('circle[fill="var(--c-accent)"]').count()).toBe(4);
  const countAccentPixels = async () => {
    const shot = await trigger.screenshot({ animations: 'disabled' });
    const { data, info } = await sharp(shot).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const accent = await resolveColors(page, ['var(--c-accent)']);
    const wanted = accent['var(--c-accent)'];
    let hits = 0;
    for (let i = 0; i < data.length; i += info.channels) {
      if (Math.abs(data[i] - wanted.r) < 26 && Math.abs(data[i + 1] - wanted.g) < 26 && Math.abs(data[i + 2] - wanted.b) < 26) hits += 1;
    }
    return hits;
  };
  const slateAccent = (await resolveColors(page, ['var(--c-accent)']))['var(--c-accent)'];
  const slateHits = await countAccentPixels();
  expect(slateHits).toBeGreaterThan(3);
  // 换成青绿后，图标里的颜料点要跟着变色。
  await setPalette(page, 'jade');
  const jadeAccent = (await resolveColors(page, ['var(--c-accent)']))['var(--c-accent)'];
  expect(jadeAccent).not.toEqual(slateAccent);
  expect(await countAccentPixels()).toBeGreaterThan(3);
});

test('首页到详情、分页与类型筛选形成完整浏览路径', async ({ page }) => {
  await page.goto('/zh/');
  await expect(page.locator('.hero h1')).toHaveText(`${site.name}.`);
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
  await expect(page.locator('#translation-modal')).toBeVisible();
  await expect(page).toHaveURL('/zh/posts/blue-hour/');
  await page.locator('#translation-modal a[href]').click();
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
  await setTheme(page, 'zh', 'dark');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
  // 复制按钮由脚本创建；成功后按钮文案会变化，因此用稳定的结构选择器读取状态。
  const copyButton = page.locator('.prose pre button');
  await expect(copyButton).toBeVisible();
  await copyButton.click();
  await expect(copyButton).toHaveAttribute('data-state','copied');
  await expect(copyButton).toHaveText('已复制');
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
  await setTheme(page, 'zh', 'dark');
  await page.emulateMedia({colorScheme:'light'});
  await expect(page.locator('html')).toHaveAttribute('data-resolved-theme','dark');
});
test('无 JavaScript 时内容与分页仍然可用', async ({ browser }) => {
  const context = await browser.newContext({javaScriptEnabled:false}); const page = await context.newPage();
  await page.goto('http://127.0.0.1:4329/zh/');
  // 背景构图和入场动效完全由 HTML 与 CSS 给出，禁用脚本后依然完整可见。
  await page.waitForTimeout(900);
  expect(await page.evaluate(() => [...document.querySelectorAll('[data-backdrop="home"] .backdrop-enter')].every(el => getComputedStyle(el).opacity === '1'))).toBe(true);
  expect(await page.evaluate(() => document.querySelectorAll('[data-backdrop="home"] .backdrop-panel').length)).toBe(5);
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
    if(name==='mobile') { await page.getByRole('button',{name:'菜单',exact:true}).click(); await expect(page.locator('#mobile-nav')).toBeVisible(); await page.getByRole('link',{name:'归档',exact:true}).click(); await expect(page).toHaveURL('/zh/archive/'); }
  }
  await page.setViewportSize({width:1440,height:1000}); await page.goto('/zh/');
  await setTheme(page, 'zh', 'dark');
  await page.screenshot({path:testInfo.outputPath('dark-home.png'),fullPage:true,animations:'disabled'});
  await page.screenshot({path:testInfo.outputPath('dark-fold.png'),animations:'disabled'});
  await page.goto('/en/'); await setTheme(page, 'en', 'light');
  await page.screenshot({path:testInfo.outputPath('english-home.png'),fullPage:true,animations:'disabled'});
  await page.goto('/zh/posts/static-by-design/');
  await page.screenshot({path:testInfo.outputPath('note-desktop.png'),fullPage:true,animations:'disabled'});
  await page.setViewportSize({width:390,height:844});
  await page.screenshot({path:testInfo.outputPath('note-mobile.png'),fullPage:true,animations:'disabled'});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});
test('标签回退入口只在无脚本模式下显示', async ({ page, browser }) => {
  await page.goto('/zh/');
  await expect(page.locator('.no-js-only')).toBeHidden();
  const context = await browser.newContext({ javaScriptEnabled: false });
  try {
    const plain = await context.newPage();
    await plain.goto('http://127.0.0.1:4329/zh/');
    await expect(plain.locator('.no-js-only')).toBeVisible();
    for (const control of await plain.locator('.js-only').all()) await expect(control).toBeHidden();
    await plain.locator('.no-js-only').click();
    await expect(plain).toHaveURL(/\/zh\/tags\/$/);
  } finally { await context.close(); }
});

test('搜索初始化幂等，命中词和代码高亮使用主题样式', async ({ page }) => {
  await page.goto('/zh/search/');
  // 主动重放生命周期事件，模拟 load 和 page-load 先后到达。
  await page.evaluate(() => {
    document.dispatchEvent(new Event('astro:page-load'));
    document.dispatchEvent(new Event('astro:page-load'));
  });
  await page.getByRole('searchbox').fill('构建');
  await expect(page.locator('#search-status')).toHaveText(/\d+.*结果/);
  const count = Number((await page.locator('#search-status').innerText()).match(/\d+/)![0]);
  await expect(page.locator('.search-result')).toHaveCount(Math.min(count, 10));
  const links = await page.locator('[data-result-link]').evaluateAll(nodes => nodes.map(node => node.getAttribute('href')));
  expect(new Set(links).size).toBe(links.length);
  await setTheme(page, 'zh', 'dark');
  const colors = await page.locator('[data-result-excerpt] mark').first().evaluate(el => ({ background: getComputedStyle(el).backgroundColor, color: getComputedStyle(el).color }));
  expect(colors.background).not.toBe('rgb(255, 255, 0)');
  expect(colors.color).not.toBe(colors.background);
  await page.getByRole('button', { name: '清空搜索', exact: true }).click();
  await expect(page.locator('.search-result')).toHaveCount(0);
  await page.goto('/zh/posts/static-by-design/');
  const token = page.locator('.astro-code span[style*="--shiki-light"]').first();
  const darkColor = await token.evaluate(el => getComputedStyle(el).color);
  await setTheme(page, 'zh', 'light');
  await expect.poll(() => token.evaluate(el => getComputedStyle(el).color)).not.toBe(darkColor);
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
