import { readFileSync } from "node:fs";
const css = readFileSync("src/styles/global.css", "utf8");
const blocks = [];
// 收集每个上下文里的 canvas / surface / page-base
function pick(text, re) { const m = text.match(re); return m ? m[1].trim() : null; }
function luminance(hex) { const v = hex.replace("#", ""); const [r, g, b] = [0, 2, 4].map(i => parseInt(v.slice(i, i + 2), 16) / 255); const f = c => c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); }
function lightness(hex) { const Y = luminance(hex); return Y > 0.008856 ? 116 * Math.cbrt(Y) - 16 : 903.3 * Y; }
const palettes = ["slate", "jade", "violet", "clay", "graphite"];
for (const theme of ["light", "dark"]) {
  for (const palette of palettes) {
    const head = theme === "light" ? (palette === "slate" ? ":root \\{" : `:root\\[data-palette='${palette}'\\] \\{`) : `:root\\[data-theme='dark'\\]\\[data-palette='${palette}'\\] \\{`;
    const m = css.match(new RegExp(head + "([\\s\\S]*?)\\n\\}"));
    if (!m) { console.log(`${palette}/${theme}: block not found`); continue; }
    const body = m[1];
    const canvas = palette === "slate" && theme === "light" ? pick(css, /:root \{[\s\S]*?--c-canvas: (#[0-9a-f]{6});/) : pick(body, /--c-canvas: (#[0-9a-f]{6});/);
    const surface = theme === "light" ? "#ffffff" : (palette === "slate" ? pick(css, /:root\[data-theme='dark'\] \{[\s\S]*?--c-surface: (#[0-9a-f]{6});/) : pick(body, /--c-surface: (#[0-9a-f]{6});/));
    const pageBase = pick(body, /--backdrop-page-base: radial-gradient\([^)]*?, (#[0-9a-f]{6}) 0%/);
    if (!canvas || !surface || !pageBase) { console.log(`${palette}/${theme}: canvas=${canvas} surface=${surface} page=${pageBase}`); continue; }
    console.log(`${palette.padEnd(9)}/${theme.padEnd(5)} canvas=${canvas} pageTop=${pageBase} card=${surface}  dL*(pageTop→card)=${(lightness(surface) - lightness(pageBase)).toFixed(1)}  dL*(canvas→card)=${(lightness(surface) - lightness(canvas)).toFixed(1)}`);
  }
}
