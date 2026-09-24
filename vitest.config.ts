import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const src = fileURLToPath(new URL("./src", import.meta.url));

export default defineConfig({
	resolve: {
		// 与 tsconfig.json 的 paths 保持一致，测试才能直接 import 站点模块。
		alias: {
			"@components": `${src}/components`,
			"@assets": `${src}/assets`,
			"@constants": `${src}/constants`,
			"@utils": `${src}/utils`,
			"@i18n": `${src}/i18n`,
			"@layouts": `${src}/layouts`,
			"@": src,
		},
	},
	test: {
		include: ["tests/unit/**/*.test.ts"],
		environment: "node",
	},
});
