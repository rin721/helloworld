/**
 * 模态控制器：译文提示、图片查看与移动导航共用。
 *
 * 负责同一时间只打开一个模态层、焦点循环、背景 inert、滚动锁定、Escape、
 * 遮罩点击以及关闭后的焦点恢复。状态通过 `data-state` 暴露给 CSS 动画。
 *
 * 全部事件挂在 document 上并使用委托：软件导航会替换整份 DOM，
 * 委托监听器只需注册一次，页面切换后无需重新绑定。
 */
const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';
const EXIT_MS = 180;

type ActiveModal = { modal: HTMLElement; panel: HTMLElement; opener: HTMLElement | null; scrollY: number };

let active: ActiveModal | null = null;
let exitTimer: number | undefined;

function shell() { return document.getElementById('page-shell'); }

function focusables(panel: HTMLElement) {
  return [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(element => element.offsetWidth > 0 || element.offsetHeight > 0 || element === document.activeElement);
}

function setState(target: ActiveModal, state: 'open' | 'closing') {
  target.panel.dataset.state = state;
  const overlay = target.modal.querySelector<HTMLElement>('[data-modal-overlay]');
  if (overlay) overlay.dataset.state = state;
}

/** 隐藏模态层、解除背景限制、恢复滚动位置并恢复焦点。 */
function hide(target: ActiveModal, restoreFocus: boolean) {
  const { modal, opener, scrollY } = target;
  const panel = modal.querySelector<HTMLElement>('[data-modal-panel]');
  if (panel) delete panel.dataset.state;
  const overlay = modal.querySelector<HTMLElement>('[data-modal-overlay]');
  if (overlay) delete overlay.dataset.state;
  modal.hidden = true;
  shell()?.removeAttribute('inert');
  delete document.body.dataset.scrollLocked;
  // 锁定期间视口不可滚动，解除后把页面放回原来的位置。
  // 放到下一个任务里设置：此时 overflow 解除后的滚动范围已经生效，不会被夹回 0。
  window.setTimeout(() => window.scrollTo({ top: scrollY, behavior: 'instant' as ScrollBehavior }), 0);
  if (restoreFocus && opener?.isConnected) opener.focus();
}

export function closeModal() {
  if (!active) return;
  const current = active;
  active = null;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) { hide(current, true); return; }
  setState(current, 'closing');
  window.clearTimeout(exitTimer);
  exitTimer = window.setTimeout(() => hide(current, true), EXIT_MS);
}

/** 打开模态层；快速重复打开时立即收起上一个，不叠加状态。 */
export function openModal(modal: HTMLElement, opener?: HTMLElement | null) {
  if (active) {
    const previous = active;
    active = null;
    window.clearTimeout(exitTimer);
    hide(previous, false);
  }
  const panel = modal.querySelector<HTMLElement>('[data-modal-panel]');
  if (!panel) return;
  active = { modal, panel, opener: opener ?? (document.activeElement as HTMLElement | null), scrollY: window.scrollY };
  modal.hidden = false;
  setState(active, 'open');
  shell()?.setAttribute('inert', '');
  document.body.dataset.scrollLocked = '';
  const first = focusables(panel)[0];
  (first ?? panel).focus();
}

/**
 * 软导航前即时复位：不播退出动画，直接隐藏并解除背景限制与滚动锁，
 * 避免旧的模态状态泄漏到新页面。
 */
export function resetModal() {
  if (!active) return;
  const current = active;
  active = null;
  window.clearTimeout(exitTimer);
  hide(current, false);
}

export function isModalOpen() { return active !== null; }

function onClick(event: MouseEvent) {
  const target = event.target as HTMLElement;
  // 触发按钮可能在任意页面元素上，因此一并委托处理。
  const trigger = target.closest<HTMLElement>('[data-modal-button]');
  if (trigger) {
    const modal = document.getElementById(trigger.dataset.modalButton ?? '');
    if (modal) openModal(modal, trigger);
    return;
  }
  if (!active) return;
  if (target.closest('[data-modal-close]')) { event.preventDefault(); closeModal(); return; }
  if (!target.closest('[data-modal-panel]')) closeModal();
}

function onKeydown(event: KeyboardEvent) {
  if (!active) return;
  if (event.key === 'Escape') { event.preventDefault(); closeModal(); return; }
  if (event.key !== 'Tab') return;
  const list = focusables(active.panel);
  if (list.length === 0) { event.preventDefault(); active.panel.focus(); return; }
  const first = list[0];
  const last = list[list.length - 1];
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
}

/** 只注册一次；软导航后继续对新的 DOM 生效。 */
export function initModals() {
  document.addEventListener('click', onClick);
  document.addEventListener('keydown', onKeydown);
}
