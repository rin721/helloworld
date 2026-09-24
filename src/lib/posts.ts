import { type CollectionEntry, getCollection, render } from "astro:content";
import images, { covers } from "virtual:journal-images";
import type { ImageMetadata } from "astro";
import { kindLabels } from "../config";
import { type AppLocale, localePath, locales } from "../utils/locale";
import {
	type Cover,
	firstImage,
	isPublished,
	normalizeCover,
	sortPosts,
	summarize,
} from "./rules";

export type PostEntry = CollectionEntry<"posts">;
export type PostKind = "article" | "diary" | "note";
export type PostLayout = "text" | "illustrated" | "gallery";

/**
 * 界面消费的数据形状：字段名与 fuwari 组件的 frontmatter 约定对齐，
 * 值来自我们自己的内容集合，因此组件几乎不需要改动读取方式。
 */
export type PostData = {
	title: string;
	published: Date;
	updated?: Date;
	draft: boolean;
	description: string;
	image?: Cover;
	tags: string[];
	category: string;
	lang: string;
	prevTitle: string;
	prevSlug: string;
	nextTitle: string;
	nextSlug: string;
	// 我们内容模型里保留的字段，界面按需使用
	kind: PostKind;
	layout: PostLayout;
	featured: boolean;
	pinnedOrder?: number;
	demo: boolean;
};

export type BlogPost = {
	slug: string; // 内容组名，用于文章 URL
	id: string; // 集合原始 id：<group>/<locale>
	group: string;
	locale: AppLocale;
	body: string;
	cover?: Cover;
	publishedAt: Date;
	pinnedOrder?: number;
	translation?: { slug: string; locale: AppLocale };
	data: PostData;
	render: () => Promise<Awaited<ReturnType<typeof render>>>;
};

export function postUrl(locale: AppLocale, slug: string): string {
	return localePath(locale, `posts/${slug}`);
}

/** 只解析仓库内的相对图片引用；远程或 public 路径交给原有分支处理。 */
function resolveImage(
	ref: string | undefined,
	group: string,
): ImageMetadata | undefined {
	if (!ref || /^(?:https?:|data:|\/)/.test(ref)) return undefined;
	const key = new URL(ref, `https://content.local/content/posts/${group}/`)
		.pathname;
	return images[decodeURIComponent(key)];
}

/**
 * 封面取值统一交给 rules.normalizeCover：
 * 内容目录不在 src/ 下，位图是 ImageMetadata、SVG 是可渲染组件工厂、开发环境下的
 * 虚拟模块可能是相对 URL 字符串，三者都要归一化成可用的地址或元数据。
 */
function collect(entry: PostEntry): BlogPost {
	const [group, language] = entry.id.split("/");
	const locale = (language === "en" ? "en" : "zh") as AppLocale;
	const body = entry.body ?? "";
	// image() 对 SVG 返回组件工厂，这类封面在集合数据里只保留在原始 frontmatter，用虚拟模块的映射回退。
	const declared = covers[entry.id];
	const cover =
		normalizeCover(entry.data.cover, group) ??
		normalizeCover(declared ? images[declared] : undefined, group) ??
		normalizeCover(resolveImage(firstImage(body), group), group);
	return {
		slug: group,
		id: entry.id,
		group,
		locale,
		body,
		cover,
		publishedAt: entry.data.publishedAt,
		pinnedOrder: entry.data.pinnedOrder,
		data: {
			title: entry.data.title,
			published: entry.data.publishedAt,
			draft: entry.data.draft,
			description: summarize(body, entry.data.summary),
			image: cover,
			tags: entry.data.tags,
			category: kindLabels[locale][entry.data.kind],
			lang: locale === "en" ? "en" : "zh-CN",
			prevTitle: "",
			prevSlug: "",
			nextTitle: "",
			nextSlug: "",
			kind: entry.data.kind,
			layout: entry.data.layout,
			featured: entry.data.featured,
			pinnedOrder: entry.data.pinnedOrder,
			demo: entry.data.demo,
		},
		render: () => render(entry),
	};
}

/**
 * 可见内容按「置顶优先 + 日期倒序」排序，并在同语言内注入上一/下一篇与译文关系。
 * 草稿只在开发服务器可见，生产构建时集合本身已排除草稿。
 */
export async function allPosts(): Promise<BlogPost[]> {
	const entries = await getCollection("posts");
	const sorted = sortPosts(
		entries
			.filter((entry) => isPublished(entry.data.draft, import.meta.env.DEV))
			.map(collect),
	);
	for (const locale of locales) {
		const peers = sorted.filter((post) => post.locale === locale);
		peers.forEach((post, index) => {
			const newer = peers[index - 1];
			const older = peers[index + 1];
			if (newer) {
				post.data.nextSlug = newer.slug;
				post.data.nextTitle = newer.data.title;
			}
			if (older) {
				post.data.prevSlug = older.slug;
				post.data.prevTitle = older.data.title;
			}
		});
	}
	for (const post of sorted) {
		const other = sorted.find(
			(candidate) =>
				candidate.group === post.group && candidate.locale !== post.locale,
		);
		if (other) post.translation = { slug: other.slug, locale: other.locale };
	}
	return sorted;
}

export async function postsFor(locale: AppLocale): Promise<BlogPost[]> {
	return (await allPosts()).filter((post) => post.locale === locale);
}
