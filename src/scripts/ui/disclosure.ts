/**
 * 展开区域控制器：替代 details/summary。
 *
 * 只维护 aria-expanded 与 data-state，高度过渡由 CSS 完成。
 * 事件委托到 document，软导航替换 DOM 后无需重新绑定；
 * 每次导航后由 syncDisclosures() 把服务端给出的初始意图同步到新 DOM。
 */
function toggle(root: HTMLElement, open: boolean) {
  const trigger = root.querySelector<HTMLElement>('[data-disclosure-trigger]');
  const region = root.querySelector<HTMLElement>('[data-disclosure-region]');
  if (!region) return;
  trigger?.setAttribute('aria-expanded', open ? 'true' : 'false');
  region.dataset.state = open ? 'open' : 'closed';
  root.dataset.open = open ? 'true' : 'false';
}

/** 按初始意图同步当前页面的所有展开区域。 */
export function syncDisclosures() {
  for (const root of document.querySelectorAll<HTMLElement>('[data-disclosure]')) {
    toggle(root, root.dataset.open === 'true');
  }
}

/** 只注册一次。 */
export function initDisclosures() {
  document.addEventListener('click', event => {
    const trigger = (event.target as HTMLElement).closest<HTMLElement>('[data-disclosure-trigger]');
    if (!trigger) return;
    const root = trigger.closest<HTMLElement>('[data-disclosure]');
    const region = root?.querySelector<HTMLElement>('[data-disclosure-region]');
    if (!root || !region) return;
    toggle(root, region.dataset.state !== 'open');
  });
}
