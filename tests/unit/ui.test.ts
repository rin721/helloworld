import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

async function walk(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  return (await Promise.all(entries.map(entry => entry.isDirectory() ? walk(path.join(dir, entry.name)) : [path.join(dir, entry.name)]))).flat();
}

const sourceFiles = async () => (await walk('src')).filter(file => /\.(astro|ts)$/.test(file));

describe('自建 UI 组件与交互机制', () => {
  test('源码不使用系统下拉框、details/summary、dialog 或系统提示框', async () => {
    const forbidden: [RegExp, string][] = [
      [/<select[\s>]/i, 'select'],
      [/<details[\s>]/i, 'details'],
      [/<summary[\s>]/i, 'summary'],
      [/<dialog[\s>]/i, 'dialog'],
      [/\.showModal\s*\(/, 'showModal'],
      [/window\.(?:alert|confirm|prompt)\s*\(/, '系统提示框'],
    ];
    const offenders: string[] = [];
    for (const file of await sourceFiles()) {
      const source = await readFile(file, 'utf8');
      for (const [pattern, label] of forbidden) if (pattern.test(source)) offenders.push(`${file} 使用了${label}`);
    }
    expect(offenders).toEqual([]);
  });

  test('公共组件暴露 variant、size 与状态属性', async () => {
    const button = await readFile('src/components/ui/Button.astro', 'utf8');
    expect(button).toMatch(/variant/);
    expect(button).toMatch(/size/);
    expect(button).toMatch(/data-\[state=busy\]/);
    const iconButton = await readFile('src/components/ui/IconButton.astro', 'utf8');
    expect(iconButton).toMatch(/aria-label=\{label\}/);
    const panel = await readFile('src/components/ui/Panel.astro', 'utf8');
    expect(panel).toMatch(/variant/);
    expect(panel).toMatch(/lift/);
  });

  test('模态层与分段选择提供无障碍语义', async () => {
    const modal = await readFile('src/components/ui/Modal.astro', 'utf8');
    expect(modal).toMatch(/aria-modal="true"/);
    expect(modal).toMatch(/data-modal-panel/);
    const segmented = await readFile('src/components/ui/SegmentedControl.astro', 'utf8');
    expect(segmented).toMatch(/role="radiogroup"/);
    expect(segmented).toMatch(/role="radio"/);
    expect(segmented).toMatch(/data-state/);
    const disclosure = await readFile('src/components/ui/Disclosure.astro', 'utf8');
    expect(disclosure).toMatch(/aria-expanded/);
    expect(disclosure).toMatch(/aria-controls/);
    const popover = await readFile('src/components/ui/Popover.astro', 'utf8');
    expect(popover).toMatch(/aria-haspopup="true"/);
  });

  test('主题选择持久化并跟随系统', async () => {
    const theme = await readFile('src/scripts/ui/theme.ts', 'utf8');
    expect(theme).toMatch(/THEME_KEY = 'theme'/);
    expect(theme).toMatch(/localStorage\.getItem\(THEME_KEY\)/);
    expect(theme).toMatch(/resolveTheme/);
    const segmented = await readFile('src/scripts/ui/segmented.ts', 'utf8');
    expect(segmented).toMatch(/localStorage\.setItem\(THEME_KEY/);
    expect(segmented).toMatch(/syncThemeControls/);
    expect(theme).toMatch(/prefers-color-scheme: dark/);
    expect(theme).toMatch(/onSystemPreferenceChange/);
  });

  test('软导航：ClientRouter 与内联脚本使用同一主题键，并在 after-swap 写回根属性', async () => {
    const base = await readFile('src/layouts/Base.astro', 'utf8');
    expect(base).toMatch(/from 'astro:transitions'/);
    expect(base).toMatch(/<ClientRouter \/>/);
    // 内联脚本无法 import，键名必须与 ui/theme.ts、lib/palettes.ts 保持一致。
    const inline = base.slice(base.indexOf('astro:after-swap') - 1200, base.indexOf('astro:after-swap') + 200);
    expect(inline).toMatch(/localStorage\.getItem\('theme'\)/);
    expect(inline).toMatch(/localStorage\.getItem\('palette'\)/);
    expect(inline).toMatch(/classList\.add\('js'\)/);
    expect(base).toMatch(/astro:after-swap/);
    const theme = await readFile('src/scripts/ui/theme.ts', 'utf8');
    expect(theme).toMatch(/THEME_KEY = 'theme'/);
    const palettes = await readFile('src/lib/palettes.ts', 'utf8');
    expect(palettes).toMatch(/PALETTE_KEY = 'palette'/);
    // 内联脚本里的白名单必须与共享名单一致。
    for (const name of ['slate', 'jade', 'violet', 'clay', 'graphite']) expect(inline).toContain(`'${name}'`);
  });

  test('配色轴只走语义变量，组件里不写死色值', async () => {
    const palettes = await readFile('src/lib/palettes.ts', 'utf8');
    for (const name of ['slate', 'jade', 'violet', 'clay', 'graphite']) expect(palettes).toContain(`'${name}'`);
    const css = await readFile('src/styles/global.css', 'utf8');
    // 四份非默认配色都要有浅色与深色两组变量。
    for (const name of ['jade', 'violet', 'clay', 'graphite']) {
      expect(css).toContain(`:root[data-palette='${name}']`);
      expect(css).toContain(`:root[data-theme='dark'][data-palette='${name}']`);
      expect(css).toContain(`[data-palette='${name}']`);
    }
    expect(css).toMatch(/--c-swatch-slate/);
    // 组件与页面里不应出现写死的十六进制颜色：颜色只允许在 global.css 的令牌块中维护。
    const offenders: string[] = [];
    for (const file of (await sourceFiles()).filter(file => file.endsWith('.astro'))) {
      const source = await readFile(file, 'utf8');
      if (/#[0-9a-fA-F]{3,8}\b/.test(source)) offenders.push(file);
    }
    expect(offenders).toEqual([]);
  });

  test('脚本生命周期：page-load 初始化、before-swap 复位', async () => {
    const interactions = await readFile('src/scripts/interactions.ts', 'utf8');
    expect(interactions).toMatch(/addEventListener\('astro:page-load', initPage\)/);
    expect(interactions).toMatch(/addEventListener\('astro:before-swap'/);
    expect(interactions).toMatch(/resetModal\(\)/);
    expect(interactions).toMatch(/resetPopover\(\)/);
    // 页面级增强必须幂等，避免软导航后重复插入界面。
    expect(interactions).toMatch(/querySelector\('\.copy-code'\)/);
    const modal = await readFile('src/scripts/ui/modal.ts', 'utf8');
    expect(modal).toMatch(/export function resetModal/);
    const motion = await readFile('src/scripts/motion.ts', 'utf8');
    expect(motion).toMatch(/export function refreshMotion/);
    const search = await readFile('src/scripts/search.ts', 'utf8');
    expect(search).toMatch(/export function initSearchPage/);
    expect(search).toMatch(/addEventListener\('astro:page-load', initSearchPage\)/);
  });

  test('模态控制器覆盖焦点循环、背景 inert、滚动锁定与焦点恢复', async () => {
    const modal = await readFile('src/scripts/ui/modal.ts', 'utf8');
    for (const token of ['setAttribute(\'inert\'', 'scrollLocked', 'Escape', 'focus()', 'Tab']) expect(modal).toContain(token);
  });

  test('动效遵守位移上限与减少动效约束', async () => {
    const motion = await readFile('src/scripts/motion.ts', 'utf8');
    expect(motion).toMatch(/far: 8, mid: 16/);
    expect(motion).toMatch(/STAGGER_MS = 60/);
    expect(motion).toMatch(/reducedMotion/);
    const css = await readFile('src/styles/global.css', 'utf8');
    expect(css).toMatch(/prefers-reduced-motion: reduce/);
    expect(css).toMatch(/@theme inline/);
  });
});
