import { labels, type Locale } from '../config';
const locale = (document.body.dataset.locale || 'zh') as Locale;
const t = labels[locale];
const themeSelect = document.querySelector<HTMLSelectElement>('#theme-select');
const preference = matchMedia('(prefers-color-scheme: dark)');
function resolveTheme() { const mode = document.documentElement.dataset.theme || 'system'; document.documentElement.dataset.resolvedTheme = mode === 'system' ? preference.matches ? 'dark' : 'light' : mode; }
preference.addEventListener('change', resolveTheme);
if (themeSelect) {
  themeSelect.value = document.documentElement.dataset.theme || 'system';
  themeSelect.addEventListener('change', () => {
    document.documentElement.dataset.theme = themeSelect.value;
    resolveTheme();
    try { localStorage.setItem('theme', themeSelect.value); } catch { /* 隐私模式下依然允许当前页面切换。 */ }
  });
}
const menu = document.querySelector<HTMLButtonElement>('.menu-toggle');
const nav = document.querySelector('#main-nav');
function closeMenu() { nav?.classList.remove('open'); menu?.setAttribute('aria-expanded', 'false'); }
menu?.addEventListener('click', () => { const open = nav?.classList.toggle('open'); menu.setAttribute('aria-expanded', String(!!open)); });
nav?.querySelectorAll('a').forEach(a => a.addEventListener('click', closeMenu));
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && nav?.classList.contains('open')) { closeMenu(); menu?.focus(); } });

const translationDialog = document.querySelector<HTMLDialogElement>('#translation-dialog');
document.querySelector('[data-untranslated]')?.addEventListener('click', () => translationDialog?.showModal());
document.querySelectorAll<HTMLButtonElement>('[data-close-dialog]').forEach(button => button.addEventListener('click', () => button.closest('dialog')?.close()));
document.querySelectorAll<HTMLDialogElement>('dialog').forEach(dialog => dialog.addEventListener('click', e => { if (e.target === dialog) { const rect = dialog.getBoundingClientRect(); if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) dialog.close(); } }));

document.querySelectorAll<HTMLPreElement>('.prose pre').forEach(pre => {
  const button = document.createElement('button');
  button.type = 'button'; button.className = 'copy-code'; button.textContent = t.copy; button.setAttribute('aria-label', t.copy);
  button.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(pre.querySelector('code')?.textContent ?? ''); button.textContent = t.copied; }
    catch { button.textContent = t.copyFailed; }
    setTimeout(() => { button.textContent = t.copy; }, 2500);
  });
  pre.append(button);
});

const tocLinks = [...document.querySelectorAll<HTMLAnchorElement>('.toc a')];
const tocDetails = document.querySelector<HTMLDetailsElement>('.toc details');
if (tocDetails && matchMedia('(max-width: 760px)').matches) tocDetails.open = false;
if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => {
    const visible = entries.filter(e => e.isIntersecting).sort((a,b) => a.boundingClientRect.top - b.boundingClientRect.top);
    if (visible[0]) tocLinks.forEach(link => { if (decodeURIComponent(link.hash.slice(1)) === visible[0].target.id) link.setAttribute('aria-current', 'location'); else link.removeAttribute('aria-current'); });
  }, { rootMargin: '-5% 0px -65% 0px' });
  tocLinks.forEach(link => { const heading = document.getElementById(decodeURIComponent(link.hash.slice(1))); if (heading) observer.observe(heading); });
}

const lightbox = document.querySelector<HTMLDialogElement>('#lightbox');
const displayedImage = lightbox?.querySelector<HTMLImageElement>('img');
const pictureList = [...document.querySelectorAll<HTMLImageElement>('.prose img, .article-cover img')];
let activeImage = 0;
function showImage(index: number) {
  const source = pictureList[index];
  if (!source || !displayedImage || !lightbox) return;
  activeImage = index;
  displayedImage.src = source.currentSrc || source.src; displayedImage.alt = source.alt;
  lightbox.querySelector('figcaption')!.textContent = `${source.alt} · ${index + 1} / ${pictureList.length}`;
  lightbox.querySelector<HTMLButtonElement>('.lightbox-prev')!.disabled = index === 0;
  lightbox.querySelector<HTMLButtonElement>('.lightbox-next')!.disabled = index === pictureList.length - 1;
}
pictureList.forEach((picture, index) => {
  picture.tabIndex = 0; picture.setAttribute('role', 'button'); picture.setAttribute('aria-label', `${locale === 'zh' ? '放大图片' : 'Enlarge image'}: ${picture.alt}`);
  const open = () => { showImage(index); lightbox?.showModal(); };
  picture.addEventListener('click', open); picture.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
});
lightbox?.querySelector('.lightbox-prev')?.addEventListener('click', () => showImage(activeImage - 1));
lightbox?.querySelector('.lightbox-next')?.addEventListener('click', () => showImage(activeImage + 1));
lightbox?.addEventListener('keydown', e => { if (e.key === 'ArrowLeft') { e.preventDefault(); showImage(activeImage - 1); } if (e.key === 'ArrowRight') { e.preventDefault(); showImage(activeImage + 1); } });
