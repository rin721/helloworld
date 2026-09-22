export const locales = ['zh', 'en'] as const;
export type Locale = (typeof locales)[number];
export const site = {
  name: 'Hello World',
  pageSize: 10,
  description: {
    zh: '在文字与光影之间，记录生活，整理思考。一个关于日常、学习与慢慢生长的个人博客。',
    en: 'A personal journal of everyday discoveries, things learned, and moments worth keeping. A little space to think, slowly.',
  },
  introduction: {
    zh: '给思考一点空间，\n给日常一点回声。',
    en: 'A little room to think.\nA quieter way to see.',
  },
  author: { name: 'Hello World', bio: { zh: '这是一处等待真实故事的写作空间。', en: 'A writing space waiting for real stories.' } },
};
export const labels = {
  zh: {
    home: '首页', journal: '全部内容', archive: '归档', about: '关于', search: '搜索', tags: '标签', types: '类型',
    all: '全部', article: '文章', diary: '日记', note: '学习笔记', text: '文字', illustrated: '图文', gallery: '图片分享',
    latest: '最近的记录', featured: '精选文章', read: '开始阅读', more: '阅读全文', previous: '上一页', next: '下一页',
    contents: '文章目录', relatedPrevious: '上一篇', relatedNext: '下一篇', noResults: '没有找到相关内容',
    rss: '订阅 RSS', light: '浅色', dark: '深色', system: '跟随系统', theme: '外观', menu: '菜单', close: '关闭',
    copy: '复制代码', copied: '已复制', copyFailed: '复制失败，请手动选择代码', draft: '草稿预览', demo: '演示内容',
    untranslated: '这篇内容暂时没有英文译文。你可以继续阅读原文，或前往英文首页。', otherHome: '前往英文首页',
    searchLabel: '搜索文章、日记与学习笔记', searchPlaceholder: '你想找些什么？', searching: '正在搜索…',
    searchHint: '输入关键词，在文字中找到新的连接。', searchError: '搜索暂时不可用，请重试。', retry: '重试',
    searchCount: '条结果', back: '返回首页', skip: '跳转到正文', pinned: '置顶', photographs: '张图片',
    empty: '这里还没有内容，新的故事正在路上。', allTags: '所有标签', allTypes: '所有类型',
  },
  en: {
    home: 'Home', journal: 'Journal', archive: 'Archive', about: 'About', search: 'Search', tags: 'Tags', types: 'Types',
    all: 'All', article: 'Essay', diary: 'Diary', note: 'Study note', text: 'Writing', illustrated: 'Photo essay', gallery: 'Gallery',
    latest: 'Recent entries', featured: 'Featured essay', read: 'Read the latest', more: 'Read the story', previous: 'Previous', next: 'Next',
    contents: 'On this page', relatedPrevious: 'Previous entry', relatedNext: 'Next entry', noResults: 'No matching stories',
    rss: 'Subscribe via RSS', light: 'Light', dark: 'Dark', system: 'System', theme: 'Appearance', menu: 'Menu', close: 'Close',
    copy: 'Copy code', copied: 'Copied', copyFailed: 'Could not copy. Please select the code.', draft: 'Draft preview', demo: 'Demo content',
    untranslated: 'This entry has no Chinese translation yet. Keep reading the original, or visit the Chinese homepage.', otherHome: 'Visit Chinese homepage',
    searchLabel: 'Search essays, diaries and study notes', searchPlaceholder: 'What are you looking for?', searching: 'Searching…',
    searchHint: 'A word, a thought, a small discovery. Start here.', searchError: 'Search is unavailable. Please try again.', retry: 'Try again',
    searchCount: 'results', back: 'Back home', skip: 'Skip to content', pinned: 'Pinned', photographs: 'images',
    empty: 'A quiet space, waiting for the next story.', allTags: 'All tags', allTypes: 'All types',
  },
};
export function formatDate(date: Date, locale: Locale) {
  return new Intl.DateTimeFormat(locale === 'zh' ? 'zh-CN' : 'en-GB', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' }).format(date);
}
