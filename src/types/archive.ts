/**
 * 归档岛屿组件的数据形状：只用可序列化的纯字段（字符串与数组）。
 * 内容集合里的 Date、ImageMetadata 与 undefined 都会让 client:only 的 props 反序列化失败。
 */
export interface ArchivePost {
	slug: string;
	title: string;
	tags: string[];
	category: string;
	published: string;
}
