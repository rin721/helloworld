/**
 * 配色名单：服务端组件与浏览器控制器共用，不引用任何 DOM 能力。
 * 具体色值全部在 `src/styles/global.css` 的 `[data-palette]` 块中维护。
 */
export const paletteNames = ['slate', 'jade', 'violet', 'clay', 'graphite'] as const;
export type PaletteName = (typeof paletteNames)[number];
export const defaultPalette: PaletteName = 'slate';
export const PALETTE_KEY = 'palette';

export function isPaletteName(value: unknown): value is PaletteName {
  return typeof value === 'string' && (paletteNames as readonly string[]).includes(value);
}
