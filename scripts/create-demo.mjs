import { mkdir, writeFile, access } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

// 仅用于首版生成演示素材；遇到现有目录即跳过，避免覆盖作者内容。
const demos = [
  ['a-quieter-morning','把清晨，还给自己','A quieter kind of morning','article','illustrated',['日常','慢生活'],['Everyday','Slow living']],
  ['light-and-space','光经过的地方','Where the light goes','article','gallery',['光影','观察'],['Light','Observation']],
  ['learning-to-notice','练习看见那些小事','Learning to notice','article','text',['日常','观察'],['Everyday','Observation']],
  ['static-by-design','把计算留在构建时','Static by design','note','text',['学习','Web'],['Learning','Web']],
  ['after-the-rain','下过雨的星期三','A Wednesday after rain','diary','illustrated',['日常','日记'],['Everyday','Diary']],
  ['on-reading','阅读，是另一种散步','Reading as a kind of walking','article','text',['阅读','慢生活'],['Reading','Slow living']],
  ['blue-hour','蓝色时刻','The blue hour','article','gallery',['光影','观察'],['Light','Observation']],
  ['small-systems','从一个小系统开始','Begin with a small system','note','text',['学习','方法'],['Learning','Practice']],
  ['sunday-window','窗边的一个下午','An afternoon by the window','diary','text',['日记','慢生活'],['Diary','Slow living']],
  ['objects-and-memory','物件也有自己的记忆','Objects and memory','article','illustrated',['日常','观察'],['Everyday','Observation']],
  ['notes-on-writing','写下来，然后继续','Write it down, then carry on','note','text',['学习','写作'],['Learning','Writing']],
  ['a-place-to-begin','从这里开始','A place to begin','article','text',['写作','日常'],['Writing','Everyday']],
];
function art(variant=0) { const palettes = [['#edf3f9','#cadbec','#95aec9','#6683a2'],['#f1eee8','#d6d4cd','#a7b6bd','#718b97'],['#e7edf3','#bacbe0','#8599b9','#536d92']]; const p=palettes[variant%3]; return `<svg xmlns="http://www.w3.org/2000/svg" width="1440" height="960" viewBox="0 0 1440 960"><defs><linearGradient id="sky" x2="1" y2="1"><stop stop-color="${p[0]}"/><stop offset="1" stop-color="${p[1]}"/></linearGradient><filter id="noise"><feTurbulence type="fractalNoise" baseFrequency=".6" numOctaves="3" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="linear" slope=".055"/></feComponentTransfer></filter></defs><rect width="1440" height="960" fill="url(#sky)"/><rect x="70" y="70" width="330" height="890" fill="${p[2]}"/><rect x="870" y="0" width="360" height="960" fill="${p[2]}"/><rect x="410" y="430" width="460" height="530" fill="${p[1]}"/><rect x="1170" y="630" width="270" height="330" fill="${p[3]}"/><path d="M400 0H870V410L400 790Z" fill="${p[0]}"/><path d="M0 810L1440 200V490L400 960H0Z" fill="${p[0]}" opacity=".6"/><rect y="800" width="1440" height="160" fill="${p[1]}" opacity=".45"/><rect width="1440" height="960" filter="url(#noise)"/></svg>`; }
await mkdir('content/posts', { recursive:true }); await mkdir('content/pages', { recursive:true });
for (let index=0; index<demos.length; index++) {
  const [id,zh,en,kind,layout,tagsZh,tagsEn] = demos[index];
  const dir = path.join('content/posts',id);
  try { await access(dir); continue; } catch { /* 首次创建。 */ }
  await mkdir(dir,{recursive:true});
  if (layout!=='text') {
    await sharp(Buffer.from(art(index))).png().toFile(path.join(dir,'light.png'));
    if(layout==='gallery') await sharp(Buffer.from(art(index+1))).png().toFile(path.join(dir,'space.png'));
  }
  for (const locale of index < 6 ? ['zh','en'] : ['zh']) {
    const chinese=locale==='zh'; const title=chinese?zh:en; const tags=chinese?tagsZh:tagsEn;
    const summary=index===0?(chinese?'在一天开始之前，留一点时间给光、给安静，也给那些还没有被说出的想法。':'Before the day begins, leave a little room for light, quiet, and thoughts that have not yet found their words.'):undefined;
    const meta=['---',`title: "${title}"`,`publishedAt: 2026-${index<8?'09':'08'}-${String(22-index).padStart(2,'0')}T08:00:00Z`,`kind: ${kind}`,`layout: ${layout}`,`tags: ${JSON.stringify(tags)}`,'demo: true',...(summary?[`summary: "${summary}"`]:[]),...(index===0?['cover: ./light.png',`coverAlt: "${chinese?'清晨的几何光影':'Geometric light in the morning'}"`,'featured: true','pinnedOrder: 0']:[]),'---',''].join('\n');
    let body='';
    if(layout==='gallery') body=chinese?'![光落在浅蓝色的墙面上](./light.png)\n\n![另一种角度下的空间与阴影](./space.png)\n':'![Light falling on a pale blue wall](./light.png)\n\n![Space and shadow from another angle](./space.png)\n';
    else if(kind==='note') body=chinese?`## 先从问题开始\n\n${title}。学习的第一步，是把模糊的问题写成可以观察、可以验证的句子。这篇演示笔记用来展示章节目录、代码、表格与任务列表。\n\n## 一个最小的例子\n\n确定输入和输出之后，再决定如何组织实现。下面的函数只负责保留公开内容：\n\n\`\`\`typescript\ntype Entry = { title: string; draft: boolean };\n\nfunction published(entries: Entry[]) {\n  return entries.filter(entry => !entry.draft);\n}\n\`\`\`\n\n### 为什么保持简单\n\n清晰的边界让变化更容易定位。**一次只验证一个假设**，比同时引入多个抽象更容易积累可靠的理解。\n\n| 阶段 | 关注的问题 |\n| --- | --- |\n| 输入 | 数据从哪里来？ |\n| 处理 | 哪些计算可以提前完成？ |\n| 输出 | 怎样验证结果？ |\n\n## 留给下一次的检查\n\n- [x] 写下问题和预期结果\n- [x] 用最小示例验证规则\n- [ ] 在真实内容中继续观察\n\n> 理解并不是记住答案，而是能够解释答案为什么成立。\n\n最后，把这次的结论留在一个容易找到的地方。下次遇到相似的问题，可以从这里继续。\n`:`## Start with a question\n\n${title}. The first step in learning is to turn a vague question into something observable. This demo note explores headings, code, tables, and task lists.\n\n## A small example\n\nDefine the inputs and outputs before reaching for an abstraction. This function keeps only published entries:\n\n\`\`\`typescript\ntype Entry = { title: string; draft: boolean };\n\nfunction published(entries: Entry[]) {\n  return entries.filter(entry => !entry.draft);\n}\n\`\`\`\n\n### Keep the boundary clear\n\nTest **one assumption at a time**. A clear boundary makes it easier to understand where a change belongs.\n\n| Stage | Question |\n| --- | --- |\n| Input | Where does the data come from? |\n| Processing | What can happen at build time? |\n| Output | How do we verify the result? |\n\n## Next steps\n\n- [x] Write down the question\n- [x] Verify a small example\n- [ ] Observe it with real content\n\n> Understanding means being able to explain why an answer works.\n\nLeave your findings somewhere easy to discover, ready for the next question.\n`;
    else body=chinese?`## 留意一个瞬间\n\n${title}。一天里总有一些细小的片刻，很容易在忙碌中错过：窗边移动的光，翻到一半的书，或者路过时听见的一句话。\n\n这篇文章是博客的演示内容。它不描述作者的真实经历，而是邀请你感受文字、图片和留白共同构成的阅读节奏。\n\n${layout==='illustrated'?'![光线穿过几何空间](./light.png)\n\n*演示插画：光线与空间，使用本地图片资产。*\n\n':''}## 给日常一点空间\n\n记录不一定需要一个宏大的主题。从今天注意到的事情开始，慢慢写清楚它为什么让你停下来。你可以写下观察，也可以保留疑问。\n\n> 有些事物的意义，在我们愿意多看一眼之后才慢慢出现。\n\n一段文字可以是一处停顿。读到这里，不妨把目光从屏幕上移开，看看此刻身边有什么。\n\n## 留下一点回声\n\n我们不必每次都得出结论。把一个片刻好好保存下来，就已经是记录的价值。\n\n下次回来时，也许你会看见不同的东西。\n`:`## Notice a moment\n\n${title}. There are small moments in every day that are easy to miss: light moving across a wall, a half-finished book, or a sentence heard in passing.\n\nThis is sample content for the journal. It does not describe the author's real life; it invites you to explore the rhythm of words, images, and space.\n\n${layout==='illustrated'?'![Light moving through geometric space](./light.png)\n\n*Demo illustration: light and space, stored as a local image.*\n\n':''}## Make a little room\n\nA journal does not need a grand subject. Begin with something you noticed today, and take a moment to explain why it made you pause. Observations and unanswered questions are equally welcome.\n\n> Some things reveal their meaning only after we choose to look a little longer.\n\nA paragraph can be a place to pause. Look away from the screen for a moment and notice what is around you.\n\n## Something to return to\n\nWe do not need a conclusion every time. Keeping a moment carefully is already enough.\n\nWhen you return, you may see something different.\n`;
    await writeFile(path.join(dir,`${locale}.md`),meta+'\n'+body,'utf8');
  }
}
await mkdir('content/posts/unpublished-example',{recursive:true});
try { await access('content/posts/unpublished-example/zh.md'); } catch {
  await writeFile('content/posts/unpublished-example/zh.md','---\ntitle: "DRAFT_ONLY_SENTINEL 未公开草稿"\npublishedAt: 2026-09-22T08:00:00Z\nkind: diary\nlayout: text\ntags: ["草稿"]\ndraft: true\ndemo: true\n---\n\n这段 DRAFT_ONLY_SENTINEL 内容只能在本地开发预览中出现。\n');
}
for (const locale of ['zh','en']) {
  const filename=`content/pages/about-${locale}.md`;
  try { await access(filename); } catch { await writeFile(filename,locale==='zh'?'---\ntitle: 关于这个空间\n---\n\n## 你好，世界\n\n这是一个记录文字、图片与学习过程的个人空间。在这里，内容可以是一篇长文、一组图片，也可以是一段日记。\n\n## 关于作者\n\n这里暂时没有作者的真实介绍。你可以在这份 Markdown 中写下自己的故事、关注的话题，以及希望与读者分享的内容。\n\n## 关于这些文章\n\n目前的文章和插画均为明确标注的演示内容，用于展示不同模板、中文与英文排版，以及完整的阅读体验。\n\n未来，这里会慢慢长成自己的样子。\n':'---\ntitle: About this space\n---\n\n## Hello, world\n\nA personal space for words, images, and things learned along the way. An entry can be an essay, a collection of pictures, or a small diary note.\n\n## About the author\n\nA real author biography has not been provided yet. This Markdown page is ready for your story and the subjects you care about.\n\n## About the entries\n\nThe current writing and illustrations are labeled demo content. They show the available templates, bilingual typography, and reading experience.\n\nIn time, this space will become your own.\n'); }
}
console.log('演示内容已创建；已存在的内容未覆盖。');
