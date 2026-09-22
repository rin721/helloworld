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
if (errors.length) { console.error([...new Set(errors)].join('\n')); process.exitCode = 1; }
else console.log(`产物校验通过：${htmlFiles.length} 个 HTML 页面，内部链接、图片、RSS、Sitemap 与草稿隔离正常。`);
