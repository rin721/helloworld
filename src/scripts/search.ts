import { labels, type Locale } from '../config';
type SearchResult = { url: string; meta: { title?: string }; excerpt: string };
type SearchHandle = { data: () => Promise<SearchResult> };
type SearchIndex = { search: (query: string) => Promise<{ results: SearchHandle[] }>; options: (options: { excerptLength: number }) => Promise<void> };
const locale = (document.body.dataset.locale || 'zh') as Locale;
const t = labels[locale];
const form = document.querySelector<HTMLFormElement>('#search-form');
const input = document.querySelector<HTMLInputElement>('#search-input')!;
const status = document.querySelector<HTMLElement>('#search-status')!;
const container = document.querySelector<HTMLElement>('#search-results')!;
const retry = document.querySelector<HTMLButtonElement>('#search-retry')!;
const more = document.querySelector<HTMLButtonElement>('#search-more')!;
let index: SearchIndex | undefined;
let requestId = 0;
let results: SearchHandle[] = [];
let shown = 0;
let timer: ReturnType<typeof setTimeout>;
// Pagefind 的摘要仅保留文本及高亮标记，不将结果作为任意 HTML 注入。
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
  parsed.body.childNodes.forEach(node => walk(node, fragment));
  return fragment;
}
async function appendResults(id: number) {
  more.disabled = true;
  try {
    const batch = await Promise.all(results.slice(shown, shown + 10).map(result => result.data()));
    if (id !== requestId) return;
    for (const result of batch) {
      const url = new URL(result.url, location.origin);
      if (url.origin !== location.origin || !url.pathname.startsWith(`/${locale}/posts/`)) continue;
      const article = document.createElement('article'); article.className = 'search-result';
      const title = document.createElement('h2'); const link = document.createElement('a'); link.href = url.pathname; link.textContent = result.meta.title ?? result.url; title.append(link);
      const excerpt = document.createElement('p'); excerpt.append(excerptFragment(result.excerpt)); article.append(title, excerpt); container.append(article);
    }
    shown += batch.length; more.hidden = shown >= results.length;
  } finally { more.disabled = false; }
}
async function runSearch() {
  const id = ++requestId;
  const query = input.value.trim();
  const url = new URL(location.href); if (query) url.searchParams.set('q', query); else url.searchParams.delete('q'); history.replaceState({}, '', url);
  container.replaceChildren(); more.hidden = true; retry.hidden = true; results = []; shown = 0;
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
form?.addEventListener('submit', e => { e.preventDefault(); clearTimeout(timer); void runSearch(); });
input?.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(() => void runSearch(), 250); });
retry?.addEventListener('click', () => { index = undefined; void runSearch(); });
more?.addEventListener('click', () => { void appendResults(requestId).catch(() => { status.textContent = t.searchError; retry.hidden = false; }); });
if (input) { input.value = new URL(location.href).searchParams.get('q') || ''; if (input.value) void runSearch(); }
