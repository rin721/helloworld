/// <reference types="astro/client" />
/// <reference path="../.astro/types.d.ts" />

declare module "virtual:journal-images" {
	import type { ImageMetadata } from "astro";

	const images: Record<string, ImageMetadata>;
	export default images;
	/** frontmatter 里声明的本地封面：`<id>/<locale>` → 站点内资产路径。 */
	export const covers: Record<string, string>;
}
