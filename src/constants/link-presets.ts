import I18nKey from "@i18n/i18nKey";
import { i18n } from "@i18n/translation";
import type { AppLocale } from "@utils/locale";
import { localePath } from "@utils/locale";
import { LinkPreset, type NavBarLink } from "@/types/config";

/**
 * 预置导航项在渲染时按语言解析：名称取词典，路径带 /en/ 前缀。
 * 不能做成模块级常量，否则静态构建时两种语言会共用同一份名称与链接。
 */
export function linkPresets(locale: AppLocale): {
	[key in LinkPreset]: NavBarLink;
} {
	return {
		[LinkPreset.Home]: {
			name: i18n(I18nKey.home, locale),
			url: localePath(locale),
		},
		[LinkPreset.Archive]: {
			name: i18n(I18nKey.archive, locale),
			url: localePath(locale, "archive"),
		},
		[LinkPreset.About]: {
			name: i18n(I18nKey.about, locale),
			url: localePath(locale, "about"),
		},
	};
}
