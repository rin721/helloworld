/**
 * 站点语言：中文是默认语言并直接占用根路径，英文统一在 /en/ 下。
 * 路由、i18n 文案、RSS 与 sitemap 都以这里为唯一来源。
 */
export const locales = ["zh", "en"] as const;

export type AppLocale = (typeof locales)[number];

export const defaultLocale: AppLocale = "zh";

export function isLocale(value: unknown): value is AppLocale {
	return value === "zh" || value === "en";
}

/** 从路径推出语言：/en/... 是英文，其余都是默认语言。 */
export function localeFromPathname(pathname: string): AppLocale {
	const [first] = pathname.split("/").filter(Boolean);
	return isLocale(first) ? first : defaultLocale;
}

/** 生成带语言前缀的路径，默认语言不加前缀；所有路径都以 / 结尾。 */
export function localePath(locale: AppLocale, path = ""): string {
	const clean = path.replace(/^\/+/, "").replace(/\/+$/, "");
	const prefix = locale === defaultLocale ? "" : `/${locale}`;
	if (!clean) return prefix ? `${prefix}/` : "/";
	return `${prefix}/${clean}/`;
}

/** 首页判定：中英文首页分别是 / 与 /en/。 */
export function isHomePath(pathname: string): boolean {
	const clean = pathname.replace(/\/+$/, "");
	return locales.some(
		(locale) => localePath(locale).replace(/\/+$/, "") === clean,
	);
}
