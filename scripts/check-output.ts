import { readFile, readdir, access } from 'node:fs/promises';
import path from 'node:path';
import { load } from 'cheerio';
import { readContent } from './check-content';
const root = path.resolve('dist');
async function walk(dir: string): Promise<string[]> { return (await Promise.all((await readdir(dir, { withFileTypes: true })).map(e => e.isDirectory() ? walk(path.join(dir,e.name)) : [path.join(dir,e.name)]))).flat(); }
const files = await walk(root);
const errors: string[] = [];
const htmlFiles = files.filter(f => f.endsWith('.html'));
const draftRecords = (await readContent()).filter(p => p.data.draft);
const drafts = new Set(draftRecords.map(p => `/${p.locale}/posts/${p.id}/`));
const readCache = new Map<string, ReturnType<typeof load>>();
async function html(file: string) { if (!readCache.has(file)) readCache.set(file, load(await readFile(file,'utf8'))); return readCache.get(file)!; }
for (const file of htmlFiles) {
  const $ = await html(file);
  const relative = '/' + path.relative(root,file).split(path.sep).join('/').replace(/index\.html$/, '');
  const isRedirect = $('meta[http-equiv="refresh"]').length > 0;
  // 内容卡片不允许恢复旧的顶部装饰线；背景独立短线不受此限制。
  if ($('.hairline').length) errors.push(`${relative}: 残留内容容器装饰线 .hairline`);
  if (!isRedirect && (!$('html').attr('lang') || !$('title').text() || !$('link[rel="canonical"]').attr('href'))) errors.push(`${relative}: 缺少语言、标题或 canonical`);
  if (!isRedirect && $('h1').length !== 1) errors.push(`${relative}: 必须有且只有一个主标题`);
  const canonical = $('link[rel="canonical"]').attr('href');
  if (!isRedirect && canonical && new URL(canonical).pathname !== new URL(relative, 'http://build.local').pathname) errors.push(`${relative}: canonical 路径不正确`);
  for (const el of $('script[type="application/ld+json"]').toArray()) {
    try { const schema = JSON.parse($(el).text()); if (schema.url !== canonical) errors.push(`${relative}: JSON-LD URL 与 canonical 不一致`); }
    catch { errors.push(`${relative}: JSON-LD 无法解析`); }
  }
  const base = new URL(relative, 'http://build.local');
  const references = [...$('a[href], link[href], script[src], img[src]')].map(el => $(el).attr('href') ?? $(el).attr('src')).filter((s): s is string => !!s);
  references.push(...$('img[srcset], source[srcset]').toArray().flatMap(el => ($(el).attr('srcset') ?? '').split(',').map(s => s.trim().split(/\s+/)[0]).filter(Boolean)));
  references.push(...$('link[rel="alternate"][hreflang]').toArray().map(el => new URL($(el).attr('href')!).pathname));
  references.push(...$('meta[property="og:image"]').toArray().map(el => new URL($(el).attr('content')!).pathname));
  for (const src of references) {
    if (/^(?:https?:|mailto:|data:|tel:)/i.test(src)) continue;
    const url = new URL(src, base);
    if (drafts.has(url.pathname)) { errors.push(`${relative}: 引用了草稿 ${url.pathname}`); continue; }
    let target = path.join(root, decodeURIComponent(url.pathname));
    if (url.pathname.endsWith('/')) target = path.join(target, 'index.html');
    try {
      await access(target);
      if (url.hash && target.endsWith('.html')) { const other = await html(target); const id = decodeURIComponent(url.hash.slice(1)); if (!other('[id]').toArray().some(e => other(e).attr('id') === id)) errors.push(`${relative}: 锚点不存在 ${src}`); }
    } catch { errors.push(`${relative}: 链接或资源不存在 ${src}`); }
  }
}
for (const file of files.filter(f => /\.(html|xml|json|js|svg)$/.test(f) && !f.includes(`${path.sep}pagefind${path.sep}`))) {
  const content = await readFile(file,'utf8');
  if (content.includes('DRAFT_ONLY_SENTINEL')) errors.push(`${path.relative(root,file)}: 草稿标记进入公开产物`);
  for (const draft of drafts) if (content.includes(draft)) errors.push(`${path.relative(root,file)}: 草稿路径进入公开产物`);
}
for (const locale of ['zh','en']) {
  const rss = load(await readFile(path.join(root,locale,'rss.xml'),'utf8'), { xmlMode: true });
  const expected = (await readContent()).filter(p => p.locale === locale && !p.data.draft).length;
  if (rss('item').length !== expected) errors.push(`${locale}: RSS 条目数量不符`);
}
if (!files.some(f => path.basename(f) === 'pagefind.js')) errors.push('缺少 Pagefind 搜索产物');
if (!files.some(f => path.basename(f) === 'sitemap-index.xml')) errors.push('缺少 Sitemap');

// 产品交互检查：不残留系统下拉框、details/summary、dialog 或系统提示框。
const forbidden: [RegExp, string][] = [
  [/<select[\s>]/i, 'select 元素'],
  [/<details[\s>]/i, 'details 元素'],
  [/<summary[\s>]/i, 'summary 元素'],
  [/<dialog[\s>]/i, 'dialog 元素'],
  [/\.showModal\s*\(/, 'showModal 调用'],
  [/\b(?:window\.)?(?:alert|confirm|prompt)\s*\(/, '系统提示框调用'],
];
for (const file of htmlFiles) {
  const source = await readFile(file, 'utf8');
  for (const [pattern, label] of forbidden) if (pattern.test(source)) errors.push(`${path.relative(root, file)}: 仍在使用${label}`);
}
for (const file of files.filter(f => f.endsWith('.js') && f.includes(`${path.sep}_astro${path.sep}`))) {
  const source = await readFile(file, 'utf8');
  for (const [pattern, label] of forbidden.slice(4)) if (pattern.test(source)) errors.push(`${path.relative(root, file)}: 仍在使用${label}`);
}

// 样式检查：语义工具类必须真的产出，被替代的旧组件样式必须已经删除。
// 只看应用自身的 CSS：Pagefind 自带的界面样式不属于本次卡片语言。
const css = (await Promise.all(files.filter(f => f.endsWith('.css') && !f.includes(`${path.sep}pagefind${path.sep}`)).map(f => readFile(f, 'utf8')))).join('\n');
for (const [pattern, label] of [[/\.bg-surface\b/, '语义颜色工具类 bg-surface'], [/\.page-width\b/, '页面容器工具类 page-width'], [/\.rounded-card\b/, '圆角工具类 rounded-card'], [/\.rounded-control\b/, '圆角工具类 rounded-control']] as const) {
  if (!pattern.test(css)) errors.push(`构建产物缺少${label}`);
}
// 卡片语言：全站不使用阴影，产物里不允许出现任何实际的 box-shadow 声明（Preflight 的 box-shadow:none 除外）。
if (/box-shadow:\s*(?!none)/.test(css)) errors.push('构建产物仍声明了 box-shadow，卡片语言要求全站无阴影');
if (/--elev-(?:panel|card|float)\s*:/.test(css)) errors.push('构建产物仍包含旧的阴影令牌 --elev-*');
for (const legacy of ['entry-card', 'filter-bar', 'tag-menu', 'about-art', 'search-field', 'type-filters', 'primary-link', 'hero-panel', 'hairline']) {
  if (new RegExp(`\\.${legacy}\\s*[,{]`).test(css)) errors.push(`构建产物仍包含被替代的旧样式 .${legacy}`);
}
// 配色轴：四份非默认配色都必须产出浅色与深色两组变量，缺一份就会变成半套颜色。
// 压缩后的属性选择器可能去掉引号，因此用宽松匹配。
for (const palette of ['jade', 'violet', 'clay', 'graphite']) {
  if (!new RegExp(`\\[data-palette=["']?${palette}["']?\\]`).test(css)) errors.push(`构建产物缺少配色 ${palette}`);
}
if (!css.includes('--c-on-backdrop')) errors.push('构建产物缺少背景水印文字令牌');

// Tailwind 优先：关键页面的布局必须真的由工具类承担，而不是靠遗留全局样式。
const utility = /\b(?:flex|grid|gap-\d|w-full|mx-auto|p[trblxy]?-\d|m[trblxy]?-\d|text-\[|bg-(?:surface|soft|glass|canvas|accent)|rounded-(?:card|control|chip)|md:|lg:)/;
for (const page of ['zh/index.html', 'zh/archive/index.html', 'zh/search/index.html', 'zh/about/index.html']) {
  const $ = await html(path.join(root, page));
  const hits = $('[class]').toArray().filter(el => utility.test($(el).attr('class') ?? '')).length;
  if (hits < 20) errors.push(`${page}: 布局没有实际使用 Tailwind 工具类（命中 ${hits}）`);
}

// 自建交互：模态层、浮层、分段选择与展开区域必须出现在产物中。
const home = await html(path.join(root, 'zh/index.html'));
if (home('[data-modal]').length < 3) errors.push('页面缺少自建模态层');
if (home('[aria-modal="true"]').length < 1) errors.push('模态层缺少 aria-modal');
if (home('[data-segmented]').length < 1) errors.push('页头缺少主题分段选择');
if (home('[data-palette-option]').length < 5) errors.push('页头缺少配色色板选项');
if (home('[data-backdrop="home"]').length !== 1) errors.push('首页缺少背景层次容器');
const list = await html(path.join(root, 'zh/index.html'));
if (list('[data-popover]').length < 1) errors.push('内容流缺少标签浮层');

// 软导航：非 HTML 目标必须让浏览器自己处理，否则会被当作页面交换。
for (const file of htmlFiles) {
  const $ = await html(file);
  const relative = '/' + path.relative(root, file).split(path.sep).join('/');
  for (const el of $('a[href$=".xml"]').toArray()) {
    if ($(el).attr('data-astro-reload') === undefined) errors.push(`${relative}: ${$(el).attr('href')} 缺少 data-astro-reload`);
  }
}
if (home('meta[name="astro-view-transitions-enabled"]').length !== 1) errors.push('页面缺少软导航标记');

if (errors.length) { console.error([...new Set(errors)].join('\n')); process.exitCode = 1; }
else console.log(`产物校验通过：${htmlFiles.length} 个 HTML 页面，内部链接、图片、RSS、Sitemap 与草稿隔离正常。`);
