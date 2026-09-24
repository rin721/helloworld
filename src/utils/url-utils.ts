import I18nKey from "@i18n/i18nKey";
import { i18n } from "@i18n/translation";
import type { AppLocale } from "@utils/locale";
import { defaultLocale, localeFromPathname, localePath } from "@utils/locale";

export function pathsEqual(path1: string, path2: string) {
	const normalizedPath1 = path1.replace(/^\/|\/$/g, "").toLowerCase();
	const normalizedPath2 = path2.replace(/^\/|\/$/g, "").toLowerCase();
	return normalizedPath1 === normalizedPath2;
}

function joinUrl(...parts: string[]): string {
	const joined = parts.join("/");
	return joined.replace(/\/+/g, "/");
}

export function url(path: string) {
	return joinUrl("", import.meta.env.BASE_URL, path);
}

export function getPostUrl(locale: AppLocale, slug: string): string {
	return url(localePath(locale, `posts/${slug}`));
}

export function getArchiveUrl(locale: AppLocale): string {
	return url(localePath(locale, "archive"));
}

export function getHomeUrl(locale: AppLocale): string {
	return url(localePath(locale));
}

export function getRssUrl(locale: AppLocale): string {
	if (locale === defaultLocale) return url("/rss.xml");
	return url(`${localePath(locale)}rss.xml`);
}

export function getTagUrl(
	tag: string,
	locale: AppLocale = defaultLocale,
): string {
	if (!tag) return getArchiveUrl(locale);
	return `${getArchiveUrl(locale)}?tag=${encodeURIComponent(tag.trim())}`;
}

export function getCategoryUrl(
	category: string | null | undefined,
	locale: AppLocale = defaultLocale,
): string {
	const uncategorized = i18n(I18nKey.uncategorized, locale);
	if (
		!category ||
		category.trim() === "" ||
		category.trim().toLowerCase() === uncategorized.toLowerCase()
	)
		return `${getArchiveUrl(locale)}?uncategorized=true`;
	return `${getArchiveUrl(locale)}?category=${encodeURIComponent(category.trim())}`;
}

/** 只处理首页、分页与固定页；文章页的语言切换由文章自身按译文决定。 */
const staticPaths = new Set(["", "archive", "about"]);

export function switchLocaleUrl(
	pathname: string,
	target: AppLocale,
): string | undefined {
	const current = localeFromPathname(pathname);
	const rest = pathname
		.replace(new RegExp(`^/${current}/`), "/")
		.replace(/^\/+|\/+$/g, "");
	if (staticPaths.has(rest) || /^\d+$/.test(rest))
		return localePath(target, rest);
	return undefined;
}

export function getDir(path: string): string {
	const lastSlashIndex = path.lastIndexOf("/");
	if (lastSlashIndex < 0) {
		return "/";
	}
	return path.substring(0, lastSlashIndex + 1);
}
