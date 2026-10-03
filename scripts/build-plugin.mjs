import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
process.chdir(fileURLToPath(new URL('..', import.meta.url)));
await build({
  entryPoints: ['src/plugin.js'],
  bundle: true,
  platform: 'node',
  external: ['obsidian', '@codemirror/*'],
  outfile: 'main.js'
});
