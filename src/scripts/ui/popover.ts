/**
 * 浮层控制器：标签筛选等按钮触发的链接浮层。
 *
 * 支持外部点击、Escape、方向键与 Home/End 在链接间移动，关闭后焦点回到触发按钮。
 * 同一时间只保留一个浮层，重复点击会立即收起而不是叠加动画。
 * 事件全部委托到 document：软导航替换 DOM 后无需重新绑定。
 */
const EXIT_MS = 180;
let openRoot: HTMLElement | null = null;
let exitTimer: number | undefined;

function parts(root: HTMLElement) {
  return {
    trigger: root.querySelector<HTMLElement>('[data-popover-trigger]'),
    panel: root.querySelector<HTMLElement>('[data-popover-panel]'),
  };
}
function links(root: HTMLElement) {
  return [...root.querySelectorAll<HTMLElement>('[data-popover-panel] a[href], [data-popover-panel] button')];
}

function hide(root: HTMLElement, restoreFocus: boolean) {
  const { trigger, panel } = parts(root);
  root.dataset.open = 'false';
  trigger?.setAttribute('aria-expanded', 'false');
  if (!panel) return;
  panel.hidden = true;
  delete panel.dataset.state;
  if (restoreFocus && trigger?.isConnected) trigger.focus();
}

export function closePopover(restoreFocus = false) {
  if (!openRoot) return;
  const root = openRoot;
  openRoot = null;
  window.clearTimeout(exitTimer);
  const { panel } = parts(root);
  if (!panel || matchMedia('(prefers-reduced-motion: reduce)').matches) { hide(root, restoreFocus); return; }
  panel.dataset.state = 'closing';
  exitTimer = window.setTimeout(() => hide(root, restoreFocus), EXIT_MS);
}

/** 软导航前即时复位，避免浮层状态泄漏到新页面。 */
export function resetPopover() {
  if (!openRoot) return;
  const root = openRoot;
  openRoot = null;
  window.clearTimeout(exitTimer);
  hide(root, false);
}

export function openPopover(root: HTMLElement, focusFirst = false) {
  if (openRoot === root) return;
  if (openRoot) closePopover();
  window.clearTimeout(exitTimer);
  const { trigger, panel } = parts(root);
  if (!panel) return;
  openRoot = root;
  root.dataset.open = 'true';
  trigger?.setAttribute('aria-expanded', 'true');
  panel.hidden = false;
  panel.dataset.state = 'open';
  if (focusFirst) links(root)[0]?.focus();
}

/** 只注册一次：触发器、外部点击、方向键与 Escape 都由委托处理。 */
export function initPopovers() {
  document.addEventListener('click', event => {
    const target = event.target as HTMLElement;
    const trigger = target.closest<HTMLElement>('[data-popover-trigger]');
    if (trigger) {
      const root = trigger.closest<HTMLElement>('[data-popover]');
      if (!root) return;
      if (openRoot === root) closePopover(true);
      else openPopover(root);
      return;
    }
    if (openRoot && !target.closest('[data-popover]')) closePopover();
  });

  document.addEventListener('keydown', event => {
    if (!openRoot) return;
    if (event.key === 'Escape') { event.preventDefault(); closePopover(true); return; }
    const group = (event.target as HTMLElement).closest<HTMLElement>('[data-popover]');
    if (!group || group !== openRoot) return;
    // 设置类浮层把方向键留给内部的 radiogroup。
    if (group.querySelector('[data-popover-panel]')?.getAttribute('data-popover-arrows') === 'none') return;
    const list = links(group);
    const index = list.indexOf(document.activeElement as HTMLElement);
    if (event.key === 'ArrowDown') { event.preventDefault(); list[(index + 1 + list.length) % list.length]?.focus(); }
    if (event.key === 'ArrowUp') { event.preventDefault(); list[(index - 1 + list.length) % list.length]?.focus(); }
    if (event.key === 'Home') { event.preventDefault(); list[0]?.focus(); }
    if (event.key === 'End') { event.preventDefault(); list[list.length - 1]?.focus(); }
  });

  document.addEventListener('pointerdown', event => {
    const target = event.target as HTMLElement;
    if (openRoot && !target.closest('[data-popover]')) closePopover();
  }, true);

  document.addEventListener('focusin', event => {
    const target = event.target as HTMLElement;
    if (openRoot && target.isConnected && !target.closest('[data-popover]')) closePopover();
  });
}
