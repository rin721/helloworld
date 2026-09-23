/**
 * 主题状态：唯一的模式与存储键来源，负责把选择写到文档根元素。
 *
 * 文档根属性（`data-theme`、`data-resolved-theme`、`js` 类）会在软导航时被路由清空，
 * 因此 `Base.astro` 的内联脚本也会在 `astro:after-swap` 里重新写回；内联脚本无法 import，
 * 那里只重复存储键与解析规则这两件事，单元测试会断言两处键名一致。
 */
export type ThemeMode = 'system' | 'light' | 'dark';

export const THEME_KEY = 'theme';
export const themeModes: readonly ThemeMode[] = ['system', 'light', 'dark'];
const preference = matchMedia('(prefers-color-scheme: dark)');

export function isThemeMode(value: unknown): value is ThemeMode {
  return value === 'system' || value === 'light' || value === 'dark';
}

export function resolveTheme(mode: ThemeMode, prefersDark: boolean) {
  return mode === 'system' ? (prefersDark ? 'dark' : 'light') : mode;
}

export function storedTheme(): ThemeMode {
  try {
    const value = localStorage.getItem(THEME_KEY);
    return isThemeMode(value) ? value : 'system';
  } catch { return 'system'; }
}

/** 手动切换颜色（明暗或配色）时加一个短暂过渡类，结束后移除，避免常驻 transition。 */
export function withColorTransition(duration = 340) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const root = document.documentElement;
  root.classList.add('theme-anim');
  window.setTimeout(() => root.classList.remove('theme-anim'), duration);
}

/** 把模式与最终生效的主题写到根元素，供 CSS 与控件读取。 */
export function applyDocumentTheme(mode: ThemeMode, options: { animate?: boolean } = {}) {
  const root = document.documentElement;
  if (options.animate) withColorTransition();
  root.dataset.theme = mode;
  root.dataset.resolvedTheme = resolveTheme(mode, preference.matches);
}

export function currentTheme(): ThemeMode {
  return isThemeMode(document.documentElement.dataset.theme) ? document.documentElement.dataset.theme : 'system';
}

export function onSystemPreferenceChange(handler: () => void) {
  preference.addEventListener('change', handler);
}
