/**
 * 页头滚动状态控制器。
 *
 * 三个状态由 `<header data-header-state>` 表达，实际外观在组件里用 Tailwind 的 data 变体给出：
 * - `top`    贴近页面顶部，玻璃底、无阴影；
 * - `pinned` 距顶已超过静区，向上滚动或页头内有焦点，强调外观；
 * - `hidden` 向下阅读中，整体滑出视口，但仍然留在无障碍树与 Tab 顺序里，聚焦即可显现。
 *
 * 与软导航配合：文档级监听只注册一次，`refreshHeader()` 在每次 `astro:page-load`
 * 重新查询页头、写入实测高度并重算状态，`resetHeader()` 在 `astro:before-swap` 清掉旧状态。
 */
const TOP_ZONE = 24;          // 距顶静区：这里始终保持顶部状态，避免细小抖动改变外观
const HIDE_AFTER = 96;        // 超过这个距离才允许隐藏
const DIRECTION_DELTA = 6;    // 方向判定阈值，吸收移动端地址栏收缩等突变

export type HeaderState = 'top' | 'pinned' | 'hidden';

let header: HTMLElement | null = null;
let state: HeaderState = 'top';
let lastY = 0;
let frame = 0;

function scrollLocked() { return document.body.dataset.scrollLocked !== undefined; }
function headerFocused() { return Boolean(header && header.contains(document.activeElement)); }

function setState(next: HeaderState) {
  if (!header || state === next) return;
  state = next;
  header.dataset.headerState = next;
}

/** 把实测高度写到根元素，供 `scroll-padding-top` 等补偿使用。 */
function measure() {
  if (!header) return;
  document.documentElement.style.setProperty('--header-h', `${Math.round(header.getBoundingClientRect().height)}px`);
}

function update() {
  frame = 0;
  if (!header) return;
  const y = Math.max(window.scrollY, 0);
  // 模态层锁定滚动、或用户正在用键盘操作页头时，保持可见。
  if (scrollLocked() || headerFocused()) {
    setState(y <= TOP_ZONE ? 'top' : 'pinned');
    lastY = y;
    return;
  }
  if (y <= TOP_ZONE) setState('top');
  else if (y < lastY - DIRECTION_DELTA) setState('pinned');
  else if (y > lastY + DIRECTION_DELTA && y > HIDE_AFTER) setState('hidden');
  lastY = y;
}

function schedule() { if (!frame) frame = requestAnimationFrame(update); }

/** 每次导航后重新查询页头并按当前滚动位置判定，避免把旧状态带到新页面。 */
export function refreshHeader() {
  header = document.querySelector<HTMLElement>('[data-header]');
  if (!header) return;
  measure();
  lastY = Math.max(window.scrollY, 0);
  // 初次判定不使用方向：深链或回退恢复的滚动位置不应立刻把页头藏起来。
  state = lastY <= TOP_ZONE ? 'top' : 'pinned';
  header.dataset.headerState = state;
}

/** 软导航前复位：新页面通常从顶部开始。 */
export function resetHeader() {
  if (!header) return;
  frame && cancelAnimationFrame(frame);
  frame = 0;
  state = 'top';
  header.dataset.headerState = 'top';
  lastY = 0;
}

/** 只注册一次：滚动、尺寸变化与焦点委托。 */
export function initHeader() {
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', measure);
  window.addEventListener('pageshow', refreshHeader);
  document.addEventListener('focusin', event => {
    const target = event.target as HTMLElement | null;
    if (target?.closest('[data-header]')) update();
  });
  refreshHeader();
}
