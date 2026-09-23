/**
 * 图标定义：24 网格描边路径，直线与直角为主，圆弧只用于必要的语义形状。
 * 独立成模块，方便组件只引用类型、控制器只引用名称，不重复维护图标表。
 */
export const iconPaths = {
  'arrow-right': '<path d="M4 12h15"/><path d="m13 6 6 6-6 6"/>',
  'arrow-left': '<path d="M20 12H5"/><path d="m11 6-6 6 6 6"/>',
  'arrow-up-right': '<path d="M7 17 17 7"/><path d="M8 7h9v9"/>',
  'chevron-down': '<path d="m5 9 7 7 7-7"/>',
  'chevron-right': '<path d="m9 5 7 7-7 7"/>',
  'search': '<circle cx="10.5" cy="10.5" r="6.8"/><path d="m16 16 5 5"/>',
  'close': '<path d="M6 6 18 18"/><path d="M18 6 6 18"/>',
  'menu': '<path d="M3 7h18"/><path d="M3 12h18"/><path d="M3 17h18"/>',
  'copy': '<rect x="9" y="9" width="11" height="11"/><path d="M15 5H5v10"/>',
  'check': '<path d="m5 13 4 4L19 7"/>',
  'retry': '<path d="M20 12a8 8 0 1 1-2.4-5.7"/><path d="M20 4v5h-5"/>',
  'monitor': '<rect x="3" y="4" width="18" height="12"/><path d="M8 20h8"/><path d="M12 16v4"/>',
  'sun': '<circle cx="12" cy="12" r="4.2"/><path d="M12 3v2"/><path d="M12 19v2"/><path d="M3 12h2"/><path d="M19 12h2"/><path d="m5.6 5.6 1.5 1.5"/><path d="m16.9 16.9 1.5 1.5"/><path d="m18.4 5.6-1.5 1.5"/><path d="m7.1 16.9-1.5 1.5"/>',
  'moon': '<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z"/>',
  'image': '<rect x="3" y="4" width="18" height="16"/><path d="m4 17 5-5 4 4 3-3 4 4"/>',
  /* 色彩板：画板轮廓 + 四个颜料点；颜料点填当前强调色，图标本身就显示正在使用的配色。 */
  'palette': '<path d="M12 2.6C6.8 2.6 2.6 6.8 2.6 12s4.2 9.4 9.4 9.4c.9 0 1.6-.7 1.6-1.6 0-.4-.2-.8-.4-1.1-.3-.3-.4-.7-.4-1.1 0-.9.7-1.6 1.6-1.6h1.9c3 0 5.4-2.4 5.4-5.4 0-4.8-4.3-8-8.7-8Z"/><circle cx="6.9" cy="12.6" r="1.15" stroke="none" fill="var(--c-accent)"/><circle cx="8.9" cy="7.7" r="1.15" stroke="none" fill="var(--c-accent)"/><circle cx="13.6" cy="6.9" r="1.15" stroke="none" fill="var(--c-accent)"/><circle cx="17.4" cy="10.7" r="1.15" stroke="none" fill="var(--c-accent)"/>',
  'rss': '<path d="M5 19h.01"/><path d="M5 13a6 6 0 0 1 6 6"/><path d="M5 7a12 12 0 0 1 12 12"/>',
} as const;
export type IconName = keyof typeof iconPaths;
