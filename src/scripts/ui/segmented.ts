/**
 * 分段选择控制器：主题外观等互斥选项，替代系统下拉框。
 *
 * 用文档级事件委托，配合软导航：DOM 每次导航都会被替换，委托监听器只注册一次即可继续生效。
 * 站点可能存在多处同名的分组（例如页头与移动菜单），任一处选择都会同步到全部分组。
 */
import { applyDocumentTheme, currentTheme, onSystemPreferenceChange, storedTheme, THEME_KEY, themeModes, type ThemeMode } from './theme';

function options(group: HTMLElement) {
  return [...group.querySelectorAll<HTMLElement>('[data-segmented-option]')];
}

/** 把所有分组的选中态对齐到当前模式。 */
export function syncThemeControls(mode: ThemeMode = currentTheme()) {
  for (const group of document.querySelectorAll<HTMLElement>('[data-segmented]')) {
    group.dataset.value = mode;
    for (const option of options(group)) {
      const on = option.dataset.value === mode;
      option.dataset.state = on ? 'on' : 'off';
      option.setAttribute('aria-checked', on ? 'true' : 'false');
      option.tabIndex = on ? 0 : -1;
    }
  }
}

function select(value: string, focus = false) {
  const mode: ThemeMode = themeModes.includes(value as ThemeMode) ? (value as ThemeMode) : 'system';
  try { localStorage.setItem(THEME_KEY, mode); } catch { /* 隐私模式下当前页面依然生效。 */ }
  // 手动选择时让颜色平滑过渡；跟随系统变化不播放这段过渡。
  applyDocumentTheme(mode, { animate: true });
  syncThemeControls(mode);
  if (focus) document.querySelector<HTMLElement>(`[data-segmented-option][data-value="${mode}"]`)?.focus();
}

/** 只注册一次：点击、方向键与系统偏好变化都通过委托处理。 */
export function initSegmented() {
  document.addEventListener('click', event => {
    const option = (event.target as HTMLElement).closest<HTMLElement>('[data-segmented-option]');
    if (option) select(option.dataset.value ?? 'system');
  });

  document.addEventListener('keydown', event => {
    const target = event.target as HTMLElement;
    const group = target.closest<HTMLElement>('[data-segmented]');
    if (!group) return;
    const list = options(group);
    const current = list.findIndex(option => option.dataset.state === 'on');
    const move = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 0;
    if (move === 0 && event.key !== 'Home' && event.key !== 'End') return;
    event.preventDefault();
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? list.length - 1 : (current + move + list.length) % list.length;
    select(list[next].dataset.value ?? 'system', true);
  });

  // 跟随系统时，系统主题变化要立刻反映到页面与控件。
  onSystemPreferenceChange(() => {
    if (storedTheme() === 'system') { applyDocumentTheme('system'); syncThemeControls('system'); }
  });

  syncThemeControls();
}
