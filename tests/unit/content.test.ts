import { describe, expect, it } from "vitest";
import { readContent, validateContent } from "../../scripts/check-content";

describe("内容协议", () => {
	it("现有内容全部通过字段、标识与图片校验", async () => {
		const records = await readContent();
		expect(records.length).toBeGreaterThanOrEqual(19);
		expect(await validateContent(records)).toEqual([]);
	});

	it("草稿在内容数据里被标记，构建时会从集合中排除", async () => {
		const records = await readContent();
		const drafts = records.filter((record) => record.data.draft === true);
		expect(drafts.length).toBeGreaterThan(0);
		for (const draft of drafts) {
			expect(draft.locale).toBe("zh");
		}
	});

	it("同一内容组的中英版本共享标识", async () => {
		const records = await readContent();
		const groups = new Map<string, Set<string>>();
		for (const record of records) {
			const locales = groups.get(record.id) ?? new Set<string>();
			locales.add(record.locale);
			groups.set(record.id, locales);
		}
		const bilingual = [...groups.values()].filter((locales) => locales.has("zh") && locales.has("en"));
		expect(bilingual.length).toBeGreaterThan(0);
	});

	it("拒绝缺少标题的 frontmatter", async () => {
		const errors = await validateContent([
			{
				file: `${process.cwd()}/content/posts/example/zh.md`,
				id: "example",
				locale: "zh",
				data: { publishedAt: "2026-01-01", kind: "article", layout: "text", tags: ["a"] },
				body: "",
			},
		]);
		expect(errors.join("\n")).toContain("title");
	});
});
