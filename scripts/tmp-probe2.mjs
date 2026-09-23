import { readFileSync } from "node:fs";
const css = readFileSync("src/styles/global.css", "utf8");
for (const probe of ["--radius-card", "--radius-control", "--radius-chip", "--elev-", "--backdrop-shadow", "shadow-panel", "shadow-card", "shadow-float", "box-shadow"]) {
  console.log(probe, "=>", (css.match(new RegExp(probe.replace(/[-]/g, "\\-"), "g")) ?? []).length);
}
