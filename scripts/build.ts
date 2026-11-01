import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
await build({
  absWorkingDir: fileURLToPath(new URL('../', import.meta.url)),
  entryPoints: ['frontend/app.ts', 'frontend/effects.ts', 'frontend/admin.ts'],
  outdir: 'public/build',
  bundle: true,
  splitting: true,
  format: 'esm',
  target: 'es2022',
  minify: true,
  sourcemap: false,
  chunkNames: 'chunk-[hash]',
  external: ['/assets/*', 'https://*'],
  logLevel: 'info',
});
