import type { AppLocale } from "@utils/locale";
import { defaultLocale } from "@utils/locale";
import type I18nKey from "./i18nKey";
import { en } from "./languages/en";
import { es } from "./languages/es";
import { id } from "./languages/id";
import { ja } from "./languages/ja";
import { ko } from "./languages/ko";
import { th } from "./languages/th";
import { tr } from "./languages/tr";
import { vi } from "./languages/vi";
import { zh_CN } from "./languages/zh_CN";
import { zh_TW } from "./languages/zh_TW";

export type Translation = {
	[K in I18nKey]: string;
};

const defaultTranslation = en;

const map: { [key: string]: Translation } = {
	es: es,
	en: en,
	en_us: en,
	en_gb: en,
	en_au: en,
	zh_cn: zh_CN,
	zh_tw: zh_TW,
	ja: ja,
	ja_jp: ja,
	ko: ko,
	ko_kr: ko,
	th: th,
	th_th: th,
	vi: vi,
	vi_vn: vi,
	id: id,
	tr: tr,
	tr_tr: tr,
};

export function getTranslation(lang: string): Translation {
	return map[lang.toLowerCase()] || defaultTranslation;
}

/** 站点语言到界面词典语言的映射。 */
export const dictionaryLang: Record<AppLocale, string> = {
	zh: "zh_cn",
	en: "en",
};

/**
 * 取界面文案。locale 必须由页面显式传入，静态构建时不依赖全局可变状态，
 * 否则中英文页面会互相污染。
 */
export function i18n(key: I18nKey, locale: AppLocale = defaultLocale): string {
	return getTranslation(dictionaryLang[locale])[key];
}
