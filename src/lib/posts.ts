import { getCollection, type CollectionEntry } from 'astro:content';
import type { ImageMetadata } from 'astro';
import images from 'virtual:journal-images';
import { locales, type Locale, site } from '../config';
import { firstImage, isPublished, paginate, sortPosts, summarize, translationOf } from './rules';

export type Post = CollectionEntry<'posts'> & { locale: Locale; group: string; url: string; excerpt: string };
export async function allPosts(): Promise<Post[]> {
  const entries = await getCollection('posts');
  return sortPosts(entries.filter((p) => isPublished(p.data.draft, import.meta.env.DEV)).map((p) => {
    const [group, language] = p.id.split('/');
    const locale = language as Locale;
    return { ...p, group, locale, url: `/${locale}/posts/${group}/`, excerpt: summarize(p.body ?? '', p.data.summary), publishedAt: p.data.publishedAt, pinnedOrder: p.data.pinnedOrder };
  }));
}
export async function localizedPosts(locale: Locale) { return (await allPosts()).filter((p) => p.locale === locale); }
export function getTranslation(post: Post, posts: Post[]) { return translationOf(post, posts); }
export function listPath(locale: Locale, page = 1, filter?: { type: 'tags' | 'types'; value: string }) {
  const root = filter ? `/${locale}/${filter.type}/${encodeURIComponent(filter.value)}/` : `/${locale}/`;
  return page === 1 ? root : `${root}page/${page}/`;
}
export async function listRoutes() {
  const result = [];
  for (const locale of locales) {
    const posts = await localizedPosts(locale);
    const filters: ({ type: 'tags' | 'types'; value: string } | undefined)[] = [undefined,
      ...['article', 'diary', 'note'].map(value => ({ type: 'types' as const, value })),
      ...[...new Set(posts.flatMap(p => p.data.tags))].map(value => ({ type: 'tags' as const, value }))];
    for (const filter of filters) {
      const selected = filter ? posts.filter(p => filter.type === 'types' ? p.data.kind === filter.value : p.data.tags.includes(filter.value)) : posts;
      const total = Math.max(1, Math.ceil(selected.length / site.pageSize));
      for (let page = 1; page <= total; page++) {
        const path = listPath(locale, page, filter).split('/').slice(2).join('/').replace(/\/$/, '');
        result.push({ params: { locale, path: path ? decodeURIComponent(path) : undefined }, props: { locale, ...paginate(selected, page, site.pageSize), filter, all: posts } });
      }
    }
  }
  return result;
}
export async function postCover(post: Post): Promise<ImageMetadata | undefined> {
  if (post.data.cover) return post.data.cover;
  const ref = firstImage(post.body ?? '');
  if (!ref || /^(https?:|\/)/.test(ref)) return undefined;
  const key = new URL(ref, `https://content.local/content/posts/${post.group}/`).pathname;
  return images[decodeURIComponent(key)];
}
