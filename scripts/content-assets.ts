import path from 'node:path';
import type { AstroIntegration } from 'astro';
import { readContent } from './check-content';
import { imageReferences } from '../src/lib/rules';

// 只为可见内容建立图片模块依赖，防止通配 import 把草稿资产输出到 dist。
export default function contentAssets(): AstroIntegration {
  return {
    name: 'journal-content-assets',
    hooks: {
      'astro:config:setup': ({ updateConfig, command }) => {
        const virtualId = '\0virtual:journal-images';
        updateConfig({ vite: { plugins: [{
          name: 'journal-visible-images',
          resolveId(id) { if (id === 'virtual:journal-images') return virtualId; },
          async load(id) {
            if (id !== virtualId) return;
            const entries = (await readContent()).filter(p => command === 'dev' || !p.data.draft);
            const paths = new Set<string>();
            // 记录 frontmatter 里声明的封面：image() schema 不接受 SVG，
            // 这类封面在集合数据里会消失，需要按原始 frontmatter 回退解析。
            const declared = new Map<string, string>();
            for (const entry of entries) {
              const refs = imageReferences(entry.body);
              if (typeof entry.data.cover === 'string') refs.push(entry.data.cover);
              for (const ref of refs) {
                if (/^(?:https?:|data:|\/)/.test(ref)) continue;
                const absolute = path.resolve(path.dirname(entry.file), decodeURIComponent(ref));
                const sitePath = '/' + path.relative(process.cwd(), absolute).split(path.sep).join('/');
                paths.add(sitePath);
                if (typeof entry.data.cover === 'string' && ref === entry.data.cover) {
                  declared.set(`${entry.id}/${entry.locale}`, sitePath);
                }
              }
            }
            const imports = [...paths].map((file, i) => `import image${i} from ${JSON.stringify(file)};`).join('\n');
            const values = [...paths].map((file, i) => `${JSON.stringify(file)}: image${i}`).join(',\n');
            const covers = [...declared].map(([key, sitePath]) => `${JSON.stringify(key)}: ${JSON.stringify(sitePath)}`).join(',\n');
            return `${imports}\nexport default {${values}};\nexport const covers = {${covers}};`;
          },
          handleHotUpdate({ file, server }) {
            if (file.includes(`${path.sep}content${path.sep}`)) {
              const module = server.moduleGraph.getModuleById(virtualId);
              if (module) server.moduleGraph.invalidateModule(module);
            }
          },
        }] } });
      },
    },
  };
}
