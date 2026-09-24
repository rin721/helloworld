export type Kind = "article" | "diary" | "note";
export type Presentation = "text" | "illustrated" | "gallery";
export interface Sortable {
	publishedAt: Date;
	pinnedOrder?: number;
	id: string;
}

// 规则由构建、界面和测试共用，避免摘要及分页行为各自演进。
export function summarize(body: string, explicit?: string): string {
	if (explicit?.trim()) return explicit.trim();
	const plain = body
		.replace(/```[\s\S]*?```|~~~[\s\S]*?~~~/g, "")
		.replace(/!\[[^\]]*\]\([^)]*\)/g, "")
		.replace(/!\[[^\]]*\]\[[^\]]*\]/g, "")
		.replace(/^\s*\[[^\]]+\]:.*$/gm, "")
		.replace(/<[^>]*>/g, "")
		.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
		.replace(/^[\s#>*|-]+/gm, "")
		.replace(/[`*_~]/g, "")
		.replace(/\s+/g, " ")
		.trim();
	const chars = Array.from(plain);
	return chars.length > 160 ? `${chars.slice(0, 159).join("")}…` : plain;
}
export function firstImage(body: string): string | undefined {
	return imageReferences(body)[0];
}
export function imageReferences(body: string): string[] {
	const content = body
		.replace(/```[\s\S]*?```|~~~[\s\S]*?~~~/g, "")
		.replace(/`[^`]*`/g, "");
	const images: string[] = [];
	const definitions = new Map(
		[...content.matchAll(/^\s*\[([^\]]+)\]:\s*<?([^\s>]+)>?/gm)].map((m) => [
			m[1].toLowerCase(),
			m[2],
		]),
	);
	for (const match of content.matchAll(
		/!\[([^\]]*)\](?:\(<?([^\s)>]+)>?(?:\s+"[^"]*")?\)|\[([^\]]*)\])/g,
	)) {
		const ref =
			match[2] ?? definitions.get((match[3] || match[1]).toLowerCase());
		if (ref) images.push(ref);
	}
	return images;
}
export function sortPosts<T extends Sortable>(posts: T[]): T[] {
	return [...posts].sort(
		(a, b) =>
			(a.pinnedOrder ?? Number.POSITIVE_INFINITY) -
				(b.pinnedOrder ?? Number.POSITIVE_INFINITY) ||
			b.publishedAt.getTime() - a.publishedAt.getTime() ||
			a.id.localeCompare(b.id),
	);
}
export function paginate<T>(items: T[], page: number, size = 10) {
	const total = Math.max(1, Math.ceil(items.length / size));
	if (!Number.isInteger(page) || page < 1 || page > total)
		throw new Error("Invalid page");
	return {
		items: items.slice((page - 1) * size, page * size),
		page,
		total,
		count: items.length,
	};
}
export function tagSlug(tag: string): string {
	return encodeURIComponent(tag);
}

export interface CoverMeta {
	src: string;
	width?: number;
	height?: number;
	format?: string;
}
export type Cover = CoverMeta | string | undefined;

const RASTER = new Set(["png", "jpg", "jpeg", "webp", "avif", "gif"]);

/**
 * 封面取值归一化。内容目录不在 src/ 下，同一个字段可能拿到三种形态：
 * - 位图：Astro 的 ImageMetadata（带 src/width/height/format），交给 <Image> 继续处理
 * - SVG：Astro 返回的可渲染组件工厂（工厂上挂着 src），只取地址当普通图片渲染
 * - 开发环境下的虚拟模块：直接是相对 URL 字符串
 * 绝对地址原样使用；相对地址按「资产与 Markdown 同目录」补成站点根路径。
 */
export function normalizeCover(value: unknown, group: string): Cover {
	const record =
		typeof value === "function" || (typeof value === "object" && value !== null)
			? (value as { src?: unknown; format?: unknown; width?: unknown })
			: undefined;
	const src =
		typeof value === "string"
			? value
			: typeof record?.src === "string"
				? record.src
				: undefined;
	if (!src) return undefined;
	const absolute = /^(?:https?:|data:|\/)/.test(src)
		? src
		: `/content/posts/${group}/${src.replace(/^\.\//, "")}`;
	const isRaster =
		typeof record?.format === "string" &&
		RASTER.has(record.format.toLowerCase()) &&
		typeof record.width === "number";
	return isRaster ? { ...(value as CoverMeta), src: absolute } : absolute;
}
export function isPublished(draft: boolean, development: boolean) {
	return development || !draft;
}
export function translationOf<T extends { group: string; locale: string }>(
	post: T,
	posts: T[],
): T | undefined {
	return posts.find((p) => p.group === post.group && p.locale !== post.locale);
}
