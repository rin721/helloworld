/**
 * 页面交互接线。
 *
 * 生命周期约定（与软导航配合）：
 * - 只在模块级注册一次的：主题、模态、浮层、展开区域、动效监听（文档级委托）。
 * - 每次导航都要重做的：代码复制按钮、目录观察器、图片查看、展开区域与主题控件的同步。
 *   它们统一放在 `astro:page-load`（新页面脚本执行之后触发）。
 * - `astro:before-swap`：在旧 DOM 被替换前复位模态与浮层，避免 inert 与滚动锁泄漏。
 */
import { labels, type Locale } from '../config';
import { initModals, openModal, resetModal } from './ui/modal';
import { initPopovers, resetPopover } from './ui/popover';
import { initDisclosures, syncDisclosures } from './ui/disclosure';
import { initSegmented, syncThemeControls } from './ui/segmented';
import { initHeader, refreshHeader, resetHeader } from './ui/header';
import { initPalette, applyPalette, storedPalette, syncPaletteControls } from './ui/palette';
import { applyDocumentTheme, storedTheme } from './ui/theme';
import { initMotion, refreshMotion } from './motion';

const locale = (document.body.dataset.locale || 'zh') as Locale;
const t = labels[locale];
let tocObserver: IntersectionObserver | undefined;

/* ---------------------------- 代码复制 ---------------------------- */
function initCopyButtons() {
  for (const pre of document.querySelectorAll<HTMLPreElement>('.prose pre')) {
    if (pre.querySelector('.copy-code')) continue; // 已增强过，避免重复按钮。
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'copy-code absolute top-2 right-2.5 inline-flex items-center gap-2 bg-soft px-3 py-1.5 text-[10px] text-muted transition-colors duration-200 ease-soft hover:text-ink';
    button.dataset.state = 'idle';
    const label = document.createElement('span');
    label.textContent = t.copy;
    button.append(label);
    button.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(pre.querySelector('code')?.textContent ?? '');
        label.textContent = t.copied;
        button.dataset.state = 'copied';
      } catch {
        label.textContent = t.copyFailed;
        button.dataset.state = 'failed';
      }
      setTimeout(() => { label.textContent = t.copy; button.dataset.state = 'idle'; }, 2500);
    });
    pre.append(button);
  }
}

/* ---------------------------- 目录定位 ---------------------------- */
function initToc() {
  tocObserver?.disconnect();
  tocObserver = undefined;
  const tocLinks = [...document.querySelectorAll<HTMLAnchorElement>('.toc a')];
  if (tocLinks.length === 0 || !('IntersectionObserver' in window)) return;
  tocObserver = new IntersectionObserver(entries => {
    const visible = entries.filter(entry => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
    if (!visible[0]) return;
    for (const link of tocLinks) {
      if (decodeURIComponent(link.hash.slice(1)) === visible[0].target.id) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    }
  }, { rootMargin: '-5% 0px -65% 0px' });
  for (const link of tocLinks) {
    const heading = document.getElementById(decodeURIComponent(link.hash.slice(1)));
    if (heading) tocObserver.observe(heading);
  }
}

/* ---------------------------- 图片查看 ---------------------------- */
let activeImage = 0;
let pictures: HTMLImageElement[] = [];

function showImage(index: number) {
  const source = pictures[index];
  const lightbox = document.getElementById('lightbox');
  const displayedImage = document.getElementById('lightbox-image') as HTMLImageElement | null;
  const caption = document.getElementById('lightbox-caption');
  if (!source || !displayedImage || !lightbox) return;
  activeImage = index;
  displayedImage.src = source.currentSrc || source.src;
  displayedImage.alt = source.alt;
  if (caption) caption.textContent = `${source.alt} · ${index + 1} / ${pictures.length}`;
  const previous = lightbox.querySelector<HTMLButtonElement>('.lightbox-prev');
  const next = lightbox.querySelector<HTMLButtonElement>('.lightbox-next');
  if (previous) previous.disabled = index === 0;
  if (next) next.disabled = index === pictures.length - 1;
}

function initLightbox() {
  const lightbox = document.getElementById('lightbox');
  if (!lightbox) return;
  pictures = [...document.querySelectorAll<HTMLImageElement>('.prose img, .article-cover img')];
  activeImage = 0;
  for (const [index, picture] of pictures.entries()) {
    if (picture.dataset.lightboxReady) continue; // 同一页面内不重复绑定。
    picture.dataset.lightboxReady = 'true';
    picture.tabIndex = 0;
    picture.setAttribute('role', 'button');
    picture.setAttribute('aria-label', `${locale === 'zh' ? '放大图片' : 'Enlarge image'}: ${picture.alt}`);
    const open = () => { showImage(index); openModal(lightbox, picture); };
    picture.addEventListener('click', open);
    picture.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); open(); } });
  }
}

/* --------------------------- 单次注册的控制器 --------------------------- */
initSegmented();
initModals();
initPopovers();
initDisclosures();
initMotion();
initHeader();
initPalette();
applyDocumentTheme(storedTheme());
applyPalette(storedPalette());

/* --------------------------- 每次导航都要做的工作 --------------------------- */
function initPage() {
  syncThemeControls();
  syncPaletteControls();
  syncDisclosures();
  initCopyButtons();
  initToc();
  initLightbox();
  refreshMotion();
  refreshHeader();
}

document.addEventListener('astro:page-load', initPage);
document.addEventListener('astro:before-swap', () => { resetModal(); resetPopover(); resetHeader(); });

// 路由脚本缺失或事件未触发时的兜底：正常首屏同样会由 astro:page-load 初始化。
if (document.readyState === 'complete') initPage();
else window.addEventListener('load', initPage, { once: true });

// 图片查看器的方向键与换图按钮：整站只注册一次。
document.addEventListener('click', event => {
  const target = event.target as HTMLElement;
  if (target.closest('.lightbox-prev')) showImage(activeImage - 1);
  if (target.closest('.lightbox-next')) showImage(activeImage + 1);
});
document.addEventListener('keydown', event => {
  const lightbox = document.getElementById('lightbox');
  if (!lightbox || lightbox.hidden) return;
  if (event.key === 'ArrowLeft') { event.preventDefault(); showImage(activeImage - 1); }
  if (event.key === 'ArrowRight') { event.preventDefault(); showImage(activeImage + 1); }
});
