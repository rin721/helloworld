import type {
	ExpressiveCodeConfig,
	LicenseConfig,
	NavBarConfig,
	ProfileConfig,
	SiteConfig,
} from "./types/config";
import { LinkPreset } from "./types/config";
import type { AppLocale } from "./utils/locale";

/**
 * 站点品牌与全局显示设置。文案的中英两份放在 siteText，
 * 这里只保留与语言无关的结构性配置。
 */
export const siteConfig: SiteConfig = {
	title: "Rin's Blog",
	subtitle: "在文字与光影之间",
	lang: "zh_CN", // 词典默认语言，页面语言由路由决定
	themeColor: {
		hue: 250, // 默认主题色相（蓝）
		fixed: false, // 允许读者自行调整色相
	},
	banner: {
		enable: true, // 首屏使用简洁卡片流，不启用横幅大图
		src: "assets/images/demo-banner.png",
		position: "center",
		credit: {
			enable: true,
			text: "GPTImage",
			url: "https://chatgpt.com",
		},
	},
	toc: {
		enable: true,
		depth: 2,
	},
	favicon: [
		{
			src: "/favicon.svg",
			sizes: "any",
		},
	],
};

/** 按语言提供的站点文案：副标题、meta 描述、作者名与简介。 */
export const siteText: Record<
	AppLocale,
	{ subtitle: string; description: string; author: string; bio: string }
> = {
	zh: {
		subtitle: "咕咕嘎嘎",
		description:
			"在文字与光影之间，记录生活，整理思考。一个关于日常、学习与慢慢生长的个人博客。",
		author: "Rin's Blog",
		bio: "这是一处等待真实故事的写作空间。",
	},
	en: {
		subtitle: "Between words and light",
		description:
			"A personal journal of everyday discoveries, things learned, and moments worth keeping. A little space to think, slowly.",
		author: "Rin's Blog",
		bio: "A writing space waiting for real stories.",
	},
};

/** 内容类型到分类名的映射：侧栏分类与归档筛选复用 fuwari 的分类组件。 */
export const kindLabels: Record<
	AppLocale,
	Record<"article" | "diary" | "note", string>
> = {
	zh: { article: "文章", diary: "日记", note: "学习笔记" },
	en: { article: "Essay", diary: "Diary", note: "Study note" },
};

export const navBarConfig: NavBarConfig = {
	links: [
		LinkPreset.Home,
		LinkPreset.Archive,
		LinkPreset.About,
		{
			name: "GitHub",
			url: "https://github.com/rin721", // Internal links should not include the base path, as it is automatically added
			external: true, // Show an external link icon and will open in a new tab
		},
	],
};

export const profileConfig: ProfileConfig = {
	avatar: "assets/images/demo-avatar.png",
	name: "Xiaolin",
	bio: "这是一处等待真实故事的写作空间。",
	links: [],
};

export const licenseConfig: LicenseConfig = {
	enable: true,
	name: "CC BY-NC-SA 4.0",
	url: "https://creativecommons.org/licenses/by-nc-sa/4.0/",
};

export const expressiveCodeConfig: ExpressiveCodeConfig = {
	// 部分样式（如背景色）在 astro.config.mjs 中覆盖，这里选择深色代码主题。
	theme: "github-dark",
};
