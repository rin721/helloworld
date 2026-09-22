import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { readContent } from '../scripts/check-content';

// 发布构建在内容解析前排除草稿，避免 Markdown/image schema 建立私有图片依赖。
const publicFiles = import.meta.env.PROD ? (await readContent()).filter(p => !p.data.draft).map(p => `${p.id}/${p.locale}.md`) : undefined;

const posts = defineCollection({
  loader: glob({ pattern: publicFiles ? publicFiles.length ? publicFiles : '__no_published_content__/*.md' : '**/{zh,en}.md', base: './content/posts', generateId: ({ entry }) => entry.replace(/\.md$/, '') }),
  schema: ({ image }) => z.object({
    title: z.string().trim().min(1),
    publishedAt: z.coerce.date(),
    kind: z.enum(['article', 'diary', 'note']),
    layout: z.enum(['text', 'illustrated', 'gallery']),
    tags: z.array(z.string().trim().min(1)).min(1),
    summary: z.string().optional(),
    cover: image().optional(),
    coverAlt: z.string().optional(),
    draft: z.boolean().default(false),
    featured: z.boolean().default(false),
    pinnedOrder: z.number().int().nonnegative().optional(),
    demo: z.boolean().default(false),
  }),
});
const pages = defineCollection({ loader: glob({ pattern: '*.md', base: './content/pages' }), schema: z.object({ title: z.string() }) });
export const collections = { posts, pages };
