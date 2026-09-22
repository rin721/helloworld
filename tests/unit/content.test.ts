import { describe, it, expect } from 'vitest';
import { summarize, firstImage, imageReferences, sortPosts, paginate, isPublished, translationOf } from '../../src/lib/rules';
import { readContent, validateContent } from '../../scripts/check-content';

describe('摘要与图片', () => {
  it('手写摘要优先，空白手写摘要回退到正文', () => { expect(summarize('正文', ' 手写 ')).toBe('手写'); expect(summarize('正文', ' ')).toBe('正文'); });
  it('去除图片、代码块和 Markdown 语法', () => { expect(summarize('# 标题\n\n![图](./a.png)\n\n**正文** [链接](/zh/)\n```ts\nsecret()\n```')).toBe('标题 正文 链接'); });
  it('纯图片不虚构摘要', () => { expect(summarize('![森林](./a.png)\n\n![山](./b.png)')).toBe(''); expect(summarize('![光][light]\n\n[light]: ./light.png')).toBe(''); });
  it('自动摘要最多 160 个 Unicode 字符，不切断表情', () => { const text = summarize('🌿'.repeat(200)); expect(Array.from(text)).toHaveLength(160); expect(text.endsWith('…')).toBe(true); });
  it('识别正文首图以及引用式图片', () => { expect(firstImage('![a](./first.png)\n![b](./second.png)')).toBe('./first.png'); expect(firstImage('nothing')).toBeUndefined(); expect(imageReferences('![a][photo]\n[photo]: ./a.png')).toEqual(['./a.png']); });
  it('混合图片语法保持原顺序，忽略代码中的示例图片', () => { expect(imageReferences('```md\n![fake](./missing.png)\n```\n![first][ref]\n![second](./second.png)\n[ref]: ./first.png')).toEqual(['./first.png','./second.png']); });
});
describe('内容流规则', () => {
  const records = [
    { id: 'new', publishedAt: new Date('2026-09-20') },
    { id: 'old-pin', publishedAt: new Date('2026-01-01'), pinnedOrder: 0 },
    { id: 'pin-new', publishedAt: new Date('2026-09-01'), pinnedOrder: 0 },
    { id: 'later-pin', publishedAt: new Date('2026-09-21'), pinnedOrder: 2 },
  ];
  it('置顶优先、同序按日期排列且不修改输入', () => { expect(sortPosts(records).map(r => r.id)).toEqual(['pin-new','old-pin','later-pin','new']); expect(records[0].id).toBe('new'); });
  it('分页覆盖尾页、空列表与越界', () => { expect(paginate(Array.from({length:12},(_,i)=>i),2).items).toEqual([10,11]); expect(paginate([],1)).toMatchObject({ total:1,count:0,items:[] }); expect(() => paginate([1],2)).toThrow(); expect(() => paginate([1],0)).toThrow(); });
  it('只在开发中显示草稿', () => { expect(isPublished(true,false)).toBe(false); expect(isPublished(true,true)).toBe(true); expect(isPublished(false,false)).toBe(true); });
  it('译文由内容标识关联，不借用其他文章', () => { const zh = { group:'a',locale:'zh' }; const en = { group:'a',locale:'en' }; expect(translationOf(zh,[zh,en])).toBe(en); expect(translationOf(zh,[zh,{group:'b',locale:'en'}])).toBeUndefined(); });
});
describe('构建前校验', () => {
  it('仓库中的演示内容合法', async () => { expect(await validateContent(await readContent())).toEqual([]); });
  it('重复标识、空标题、无效日期及失效图片带文件位置报错', async () => {
    const [record] = await readContent();
    const broken = { ...record, data: { ...record.data, title:'',publishedAt:'bad-date',cover:'./missing-image.png' } };
    const errors = await validateContent([broken,broken]);
    expect(errors.some(e => e.includes('重复内容标识'))).toBe(true);
    expect(errors.some(e => e.includes('title'))).toBe(true);
    expect(errors.some(e => e.includes('publishedAt'))).toBe(true);
    expect(errors.some(e => e.includes('missing-image.png'))).toBe(true);
    expect(errors.every(e => e.includes(record.id))).toBe(true);
  });
  it('画廊必须有图，图片不能逃逸仓库', async () => { const [record] = await readContent(); const errors = await validateContent([{ ...record, body:'',data:{...record.data,layout:'gallery',cover:'../../../../../outside.png'} }]); expect(errors.some(e=>e.includes('gallery'))).toBe(true); expect(errors.some(e=>e.includes('超出仓库'))).toBe(true); });
});
