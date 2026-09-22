import { readdir, readFile, access } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import matter from 'gray-matter';
import { imageReferences } from '../src/lib/rules';

export interface ContentRecord { file: string; id: string; locale: 'zh' | 'en'; data: Record<string, unknown>; body: string }
export async function readContent(root = process.cwd()): Promise<ContentRecord[]> {
  const base = path.join(root, 'content/posts');
  const records: ContentRecord[] = [];
  for (const group of await readdir(base, { withFileTypes: true })) {
    if (!group.isDirectory()) continue;
    for (const name of await readdir(path.join(base, group.name))) {
      if (!name.endsWith('.md')) continue;
      const file = path.join(base, group.name, name);
      const { data, content } = matter(await readFile(file, 'utf8'));
      records.push({ file, id: group.name, locale: name.replace(/\.md$/, '') as 'zh' | 'en', data, body: content });
    }
  }
  return records;
}
export async function validateContent(records: ContentRecord[], root = process.cwd()): Promise<string[]> {
  const errors: string[] = [];
  const ids = new Set<string>();
  for (const record of records) {
    const { data, file, id, locale, body } = record;
    const error = (message: string) => errors.push(`${path.relative(root, file)}: ${message}`);
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) error('内容目录标识必须为小写字母、数字和连字符');
    if (!['zh', 'en'].includes(locale)) error('语言文件必须为 zh.md 或 en.md');
    const key = `${id}/${locale}`;
    if (ids.has(key)) error(`重复内容标识 ${key}`); ids.add(key);
    if (typeof data.title !== 'string' || !data.title.trim()) error('缺少非空标题 title');
    if (!(typeof data.publishedAt === 'string' || data.publishedAt instanceof Date) || Number.isNaN(new Date(data.publishedAt as string).getTime())) error('publishedAt 必须为有效日期');
    if (!['article','diary','note'].includes(String(data.kind))) error('kind 必须为 article / diary / note');
    if (!['text','illustrated','gallery'].includes(String(data.layout))) error('layout 必须为 text / illustrated / gallery');
    if (!Array.isArray(data.tags) || !data.tags.length || data.tags.some(tag => typeof tag !== 'string' || !tag.trim() || /[\/#?%]/.test(tag))) error('tags 至少包含一个非空标签，不能包含 / # ? %');
    if (Array.isArray(data.tags) && new Set(data.tags).size !== data.tags.length) error('tags 包含重复标签');
    for (const boolean of ['draft','featured','demo']) if (data[boolean] !== undefined && typeof data[boolean] !== 'boolean') error(`${boolean} 必须是布尔值`);
    if (data.pinnedOrder !== undefined && (!Number.isInteger(data.pinnedOrder) || Number(data.pinnedOrder) < 0)) error('pinnedOrder 必须为非负整数');
    if (data.summary !== undefined && typeof data.summary !== 'string') error('summary 必须是字符串');
    if (data.cover !== undefined && typeof data.cover !== 'string') error('cover 必须是本地图片路径');
    const refs = imageReferences(body);
    if (data.layout === 'gallery' && refs.length === 0) error('gallery 至少需要一张正文图片');
    if (typeof data.cover === 'string') refs.push(data.cover);
    for (const ref of refs) {
      if (/^(?:https?:|data:|\/\/)/i.test(ref)) { error(`内容图片请使用可校验的本地资产：${ref}`); continue; }
      const resolved = ref.startsWith('/') ? path.resolve(root, 'public', `.${ref}`) : path.resolve(path.dirname(file), decodeURIComponent(ref));
      const relative = path.relative(root, resolved);
      if (relative.startsWith('..') || path.isAbsolute(relative)) { error(`图片超出仓库范围：${ref}`); continue; }
      try { await access(resolved); } catch { error(`图片不存在：${ref}`); }
    }
  }
  return errors;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const records = await readContent();
  const errors = await validateContent(records);
  if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; }
  else console.log(`内容校验通过：${records.length} 个语言版本，${records.filter(p => p.data.draft).length} 个草稿。`);
}
