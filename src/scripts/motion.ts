/**
 * 空间动效：几何背景分层视差与卡片错峰入场。
 *
 * - 视差按动画帧调度，指针与滚动位移相加后整体不超过 16px；正文区域不参与位移。
 * - 触屏、减少动效、离开视口或页面切到后台时暂停并回到静止位置。
 * - 卡片进入视口后播放一次 480ms 淡入与 16px 位移，同组错峰 60ms、累计不超过 240ms。
 * - 默认 HTML 内容可见：脚本失败或观察器未触发时，卡片会由兜底计时器恢复可见。
 *
 * 与软导航配合：窗口与文档级监听只在 `initMotion()` 注册一次，
 * 每次导航后由 `refreshMotion()` 重新查询元素并重建观察器。
 */
const MAX_DEPTH: Record<string, number> = { far: 8, mid: 16 };
const STAGGER_MS = 60;
const STAGGER_STEPS = 5;
const FALLBACK_MS = 1400;

const finePointer = matchMedia('(pointer: fine)');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const wideViewport = matchMedia('(min-width: 761px)');

/* ------------------------------ 视差 ------------------------------ */
let layers: HTMLElement[] = [];
let container: HTMLElement | null = null;
let pointerX = 0;
let pointerY = 0;
let scrollOffset = 0;
let frame = 0;
let listening = false;
let backdropVisible = true;
let backdropObserver: IntersectionObserver | undefined;

const enabled = () => finePointer.matches && !reducedMotion.matches && wideViewport.matches && backdropVisible && document.visibilityState === 'visible';

function render() {
  frame = 0;
  if (!container || layers.length === 0) return;
  const rect = container.getBoundingClientRect();
  const halfWidth = Math.max(rect.width / 2, 1);
  const halfHeight = Math.max(rect.height / 2, 1);
  for (const layer of layers) {
    const limit = MAX_DEPTH[layer.dataset.depth ?? ''] ?? 0;
    let nx = (pointerX - (rect.left + halfWidth)) / halfWidth;
    let ny = (pointerY - (rect.top + halfHeight)) / halfHeight;
    const distance = Math.hypot(nx, ny);
    if (distance > 1) { nx /= distance; ny /= distance; }
    // 指针位移与滚动位移相加后整体收敛到该层的上限之内。
    const x = -nx * limit;
    const y = -ny * limit * 0.6 + (layer.dataset.depth === 'mid' ? scrollOffset : scrollOffset / 2);
    const scale = Math.max(1, Math.hypot(x, y) / limit);
    layer.style.transform = `translate3d(${(x / scale).toFixed(2)}px, ${(y / scale).toFixed(2)}px, 0)`;
  }
}

function schedule() { if (listening && !frame) frame = requestAnimationFrame(render); }

function rest() {
  if (!container) return;
  const rect = container.getBoundingClientRect();
  pointerX = rect.left + rect.width / 2;
  pointerY = rect.top + rect.height / 2;
  schedule();
}

function onPointerMove(event: PointerEvent) {
  pointerX = event.clientX;
  pointerY = event.clientY;
  schedule();
}

function onScroll() {
  // 以页面滚动进度计算，静止在顶部时为 0，确保离开视差后能回到静止位置。
  const scrollable = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
  scrollOffset = Math.max(-1, Math.min(1, window.scrollY / scrollable)) * 4;
  if (listening) schedule();
}

function startParallax() {
  if (listening || !enabled()) return;
  listening = true;
  rest();
}

function stopParallax() {
  if (!listening) return;
  listening = false;
  for (const layer of layers) layer.style.transform = '';
}

function syncParallax() { if (enabled()) startParallax(); else stopParallax(); }

/** 只注册一次：窗口级监听与媒体查询变化。 */
export function initMotion() {
  window.addEventListener('pointermove', onPointerMove, { passive: true });
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('blur', rest);
  document.documentElement.addEventListener('pointerleave', rest);
  document.addEventListener('visibilitychange', syncParallax);
  for (const query of [finePointer, reducedMotion, wideViewport]) query.addEventListener('change', syncParallax);
  onScroll();
  refreshMotion();
}

/* --------------------------- 卡片错峰入场 --------------------------- */
let entranceObserver: IntersectionObserver | undefined;
let fallbackTimers: number[] = [];

function initEntrances() {
  window.clearTimeout(fallbackTimers[0]);
  window.clearTimeout(fallbackTimers[1]);
  fallbackTimers = [];
  entranceObserver?.disconnect();
  entranceObserver = undefined;
  const items = [...document.querySelectorAll<HTMLElement>('[data-motion-item]')];
  if (items.length === 0) return;
  if (reducedMotion.matches || !('IntersectionObserver' in window)) return;

  const groups = new Map<Element, number>();
  for (const item of items) if (item.dataset.motion !== 'in' && item.dataset.motion !== 'done') item.dataset.motion = 'pending';

  const reveal = (item: HTMLElement) => {
    if (item.dataset.motion !== 'pending') return;
    const group = item.parentElement ?? document.body;
    const index = groups.get(group) ?? 0;
    groups.set(group, index + 1);
    item.style.animationDelay = `${Math.min(index, STAGGER_STEPS - 1) * STAGGER_MS}ms`;
    item.dataset.motion = 'in';
    // 动画结束后交还给样式表，悬停抬升与焦点反馈不受影响。
    item.addEventListener('animationend', () => { item.dataset.motion = 'done'; item.style.animationDelay = ''; }, { once: true });
  };

  entranceObserver = new IntersectionObserver(entries => {
    for (const entry of entries) if (entry.isIntersecting) { reveal(entry.target as HTMLElement); entranceObserver?.unobserve(entry.target); }
  }, { rootMargin: '0px 0px -8% 0px' });
  for (const item of items) entranceObserver.observe(item);

  // 兜底：先恢复视口内的卡片，再恢复其余卡片，避免脚本异常时内容停留在透明状态。
  const inView = () => items.filter(item => { const rect = item.getBoundingClientRect(); return rect.top < innerHeight && rect.bottom > 0; });
  fallbackTimers.push(window.setTimeout(() => inView().forEach(reveal), FALLBACK_MS));
  fallbackTimers.push(window.setTimeout(() => items.forEach(reveal), FALLBACK_MS * 2));
}

/** 每次导航后重新查询元素并重建观察器。 */
export function refreshMotion() {
  stopParallax();
  layers = [...document.querySelectorAll<HTMLElement>('[data-depth]')];
  container = document.querySelector<HTMLElement>('[data-backdrop]');
  backdropObserver?.disconnect();
  backdropObserver = undefined;
  backdropVisible = true;
  if (container && 'IntersectionObserver' in window) {
    backdropObserver = new IntersectionObserver(entries => { backdropVisible = entries.some(entry => entry.isIntersecting); syncParallax(); }, { rootMargin: '80px' });
    backdropObserver.observe(container);
  }
  onScroll();
  syncParallax();
  initEntrances();
}
