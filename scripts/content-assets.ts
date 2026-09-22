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
            for (const entry of entries) {
              const refs = imageReferences(entry.body);
              if (typeof entry.data.cover === 'string') refs.push(entry.data.cover);
              for (const ref of refs) {
                if (/^(?:https?:|data:|\/)/.test(ref)) continue;
                const absolute = path.resolve(path.dirname(entry.file), decodeURIComponent(ref));
                paths.add('/' + path.relative(process.cwd(), absolute).split(path.sep).join('/'));
              }
            }
            const imports = [...paths].map((file, i) => `import image${i} from ${JSON.stringify(file)};`).join('\n');
            const values = [...paths].map((file, i) => `${JSON.stringify(file)}: image${i}`).join(',\n');
            return `${imports}\nexport default {${values}};`;
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
