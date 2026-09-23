/**
 * 配色状态：与明暗外观正交的主题色轴。
 *
 * `data-palette` 写在文档根元素上，颜色本身全部由 `global.css` 的语义变量给出，
 * 这里只负责模式、持久化与控件同步。根元素属性会在软导航时被路由清空，
 * 因此 `Base.astro` 的内联脚本也会在 `astro:after-swap` 里重新写回；内联脚本无法 import，
 * 那里只重复存储键与取值白名单，单元测试会断言两处一致。
 */
import { withColorTransition } from './theme';
import { PALETTE_KEY, defaultPalette, isPaletteName, paletteNames, type PaletteName } from '../../lib/palettes';

export { PALETTE_KEY, defaultPalette, isPaletteName, paletteNames };
export type { PaletteName };

export function storedPalette(): PaletteName {
  try {
    const value = localStorage.getItem(PALETTE_KEY);
    if (isPaletteName(value)) return value;
    // 未知或已移除的配色会清理掉，避免 CSS 无匹配导致半套颜色。
    if (value !== null) localStorage.removeItem(PALETTE_KEY);
  } catch { /* 隐私模式下按默认配色处理。 */ }
  return defaultPalette;
}

/** 把配色写到根元素；`animate` 只在用户主动切换时使用。 */
export function applyPalette(name: PaletteName, options: { animate?: boolean } = {}) {
  if (options.animate) withColorTransition();
  document.documentElement.dataset.palette = name;
}

export function currentPalette(): PaletteName {
  const value = document.documentElement.dataset.palette;
  return isPaletteName(value) ? value : defaultPalette;
}

/** 把所有色板分组的选中态对齐到当前配色。 */
export function syncPaletteControls(name: PaletteName = currentPalette()) {
  for (const group of document.querySelectorAll<HTMLElement>('[data-palette-group]')) {
    group.dataset.value = name;
    for (const option of group.querySelectorAll<HTMLElement>('[data-palette-option]')) {
      const on = option.dataset.value === name;
      option.dataset.state = on ? 'on' : 'off';
      option.setAttribute('aria-checked', on ? 'true' : 'false');
      option.tabIndex = on ? 0 : -1;
    }
  }
}

function select(value: string, focus = false) {
  const name: PaletteName = isPaletteName(value) ? value : defaultPalette;
  try { localStorage.setItem(PALETTE_KEY, name); } catch { /* 隐私模式下当前页面依然生效。 */ }
  applyPalette(name, { animate: true });
  syncPaletteControls(name);
  if (focus) document.querySelector<HTMLElement>(`[data-palette-option][data-value="${name}"]`)?.focus();
}

/** 只注册一次：点击与方向键都由委托处理，软导航后对新的 DOM 继续生效。 */
export function initPalette() {
  document.addEventListener('click', event => {
    const option = (event.target as HTMLElement).closest<HTMLElement>('[data-palette-option]');
    if (option) select(option.dataset.value ?? defaultPalette);
  });

  document.addEventListener('keydown', event => {
    const target = event.target as HTMLElement;
    const group = target.closest<HTMLElement>('[data-palette-group]');
    if (!group) return;
    const list = [...group.querySelectorAll<HTMLElement>('[data-palette-option]')];
    const current = list.findIndex(option => option.dataset.state === 'on');
    const move = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 0;
    if (move === 0 && event.key !== 'Home' && event.key !== 'End') return;
    event.preventDefault();
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? list.length - 1 : (current + move + list.length) % list.length;
    select(list[next].dataset.value ?? defaultPalette, true);
  });

  syncPaletteControls();
}
