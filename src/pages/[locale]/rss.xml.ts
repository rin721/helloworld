import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { locales, site } from '../../config';
import { localizedPosts } from '../../lib/posts';
export function getStaticPaths() { return locales.map(locale => ({ params: { locale } })); }
export async function GET(context: APIContext) {
  const locale = context.params.locale as 'zh' | 'en';
  const posts = (await localizedPosts(locale)).filter(p => !p.data.draft);
  return rss({ title: `${site.name} · ${locale}`, description: site.description[locale], site: context.site!, items: posts.map(p => ({ title: p.data.title, pubDate: p.data.publishedAt, description: p.excerpt || p.data.title, link: p.url })), customData: `<language>${locale === 'zh' ? 'zh-CN' : 'en'}</language>` });
}
