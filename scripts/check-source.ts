import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
async function check(directory: string): Promise<void> {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      await check(path);
      continue;
    }
    if (!path.endsWith('.ts')) continue;
    const source = await readFile(path, 'utf8');
    if (/\bvar\s+[A-Za-z_$]/.test(source)) throw new Error(`Use let or const: ${path}`);
  }
}
for (const directory of ['backend', 'frontend', 'shared', 'scripts']) await check(directory);
console.log('PASS: application and test sources use let/const declarations.');
