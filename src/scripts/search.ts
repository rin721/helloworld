/**
 * 搜索页面。
 *
 * 与软导航配合：站点只在第一次进入搜索页时执行这个模块，
 * 因此全部接线放在 `initSearchPage()` 里，由 `astro:page-load` 在每次导航后调用。
 * 搜索结果复用页面中预渲染的模板，脚本不另外拼一套界面。
 */
import { labels, type Locale } from '../config';

type SearchResult = { url: string; meta: { title?: string }; excerpt: string };
type SearchHandle = { data: () => Promise<SearchResult> };
type SearchIndex = { search: (query: string) => Promise<{ results: SearchHandle[] }>; options: (options: { excerptLength: number }) => Promise<void> };

// Pagefind 索引体积较大，跨页面复用同一份实例。
let index: SearchIndex | undefined;
// load 与 astro:page-load 可能先后触发；每个表单节点只接线一次。
const initializedForms = new WeakSet<HTMLFormElement>();

function excerptFragment(html: string) {
  const parsed = new DOMParser().parseFromString(html, 'text/html');
  const fragment = document.createDocumentFragment();
  function walk(node: Node, target: Node) {
    if (node.nodeType === Node.TEXT_NODE) target.appendChild(document.createTextNode(node.textContent || ''));
    else if (node instanceof Element) {
      if (node.tagName === 'SCRIPT' || node.tagName === 'STYLE') return;
      if (node.tagName === 'MARK') { const mark = document.createElement('mark'); target.appendChild(mark); node.childNodes.forEach(n => walk(n, mark)); }
      else node.childNodes.forEach(n => walk(n, target));
    }
  }
  // Pagefind 的摘要仅保留文本及高亮标记，不将结果作为任意 HTML 注入。
  parsed.body.childNodes.forEach(node => walk(node, fragment));
  return fragment;
}

export function initSearchPage() {
  const form = document.querySelector<HTMLFormElement>('#search-form');
  if (!form || initializedForms.has(form)) return;
  initializedForms.add(form);
  const locale = (document.body.dataset.locale || 'zh') as Locale;
  const t = labels[locale];
  const input = document.querySelector<HTMLInputElement>('#search-input')!;
  const status = document.querySelector<HTMLElement>('#search-status')!;
  const container = document.querySelector<HTMLElement>('#search-results')!;
  const retry = document.querySelector<HTMLButtonElement>('#search-retry')!;
  const more = document.querySelector<HTMLButtonElement>('#search-more')!;
  const clear = document.querySelector<HTMLButtonElement>('[data-search-clear]');
  const template = document.querySelector<HTMLTemplateElement>('#search-result-template');
  let requestId = 0;
  let results: SearchHandle[] = [];
  let shown = 0;
  let timer: ReturnType<typeof setTimeout>;

  function syncClear() { if (clear) clear.hidden = input.value.length === 0; }

  async function appendResults(id: number) {
    more.disabled = true;
    try {
      const batch = await Promise.all(results.slice(shown, shown + 10).map(result => result.data()));
      if (id !== requestId) return;
      for (const result of batch) {
        const url = new URL(result.url, location.origin);
        if (url.origin !== location.origin || !url.pathname.startsWith(`/${locale}/posts/`)) continue;
        if (!template) continue;
        const article = template.content.firstElementChild?.cloneNode(true) as HTMLElement | undefined;
        if (!article) continue;
        const link = article.querySelector<HTMLAnchorElement>('[data-result-link]');
        if (link) { link.href = url.pathname; link.textContent = result.meta.title ?? result.url; }
        const excerpt = article.querySelector<HTMLElement>('[data-result-excerpt]');
        if (excerpt) excerpt.replaceChildren(excerptFragment(result.excerpt));
        container.append(article);
      }
      shown += batch.length;
      more.hidden = shown >= results.length;
    } finally { more.disabled = false; }
  }

  async function runSearch() {
    const id = ++requestId;
    const query = input.value.trim();
    const url = new URL(location.href); if (query) url.searchParams.set('q', query); else url.searchParams.delete('q'); history.replaceState({}, '', url);
    container.replaceChildren(); more.hidden = true; retry.hidden = true; results = []; shown = 0;
    syncClear();
    if (!query) { status.textContent = t.searchHint; return; }
    status.textContent = t.searching;
    try {
      if (!index) { const path = '/pagefind/pagefind.js'; index = await import(/* @vite-ignore */ path) as SearchIndex; await index.options({ excerptLength: 28 }); }
      const response = await index.search(query);
      if (id !== requestId) return;
      results = response.results;
      status.textContent = results.length ? `${results.length} ${t.searchCount}` : t.noResults;
      await appendResults(id);
    } catch { if (id === requestId) { status.textContent = t.searchError; retry.hidden = false; } }
  }

  form.addEventListener('submit', event => { event.preventDefault(); clearTimeout(timer); void runSearch(); });
  input.addEventListener('input', () => { syncClear(); clearTimeout(timer); timer = setTimeout(() => void runSearch(), 250); });
  clear?.addEventListener('click', () => { input.value = ''; input.focus(); clearTimeout(timer); void runSearch(); });
  retry?.addEventListener('click', () => { index = undefined; void runSearch(); });
  more?.addEventListener('click', () => { void appendResults(requestId).catch(() => { status.textContent = t.searchError; retry.hidden = false; }); });

  input.value = new URL(location.href).searchParams.get('q') || '';
  syncClear();
  if (input.value) void runSearch();
}

document.addEventListener('astro:page-load', initSearchPage);
if (document.readyState === 'complete') initSearchPage();
else window.addEventListener('load', initSearchPage, { once: true });
