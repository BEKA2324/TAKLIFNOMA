import { readFile } from 'node:fs/promises';
import type { ServerResponse } from 'node:http';
import { createHash } from 'node:crypto';
import type { IncomingHttpHeaders } from 'node:http';
const root = new URL('../public/', import.meta.url);
interface CachedFile {
  bytes: Buffer;
  etag: string;
}
const cache = new Map<string, CachedFile>();
export async function serveStatic(
  path: string,
  res: ServerResponse,
  headers: IncomingHttpHeaders,
): Promise<boolean> {
  const assets: Record<string, [string, string]> = {
    '/': ['index.html', 'text/html; charset=utf-8'],
    '/admin': ['admin.html', 'text/html; charset=utf-8'],
    '/assets/butterfly.glb': ['assets/butterfly.glb', 'model/gltf-binary'],
    '/assets/pink-flowers.jpg': ['assets/pink-flowers.jpg', 'image/jpeg'],
  };
  let file = assets[path];
  if (/^\/build\/[\w.-]+\.(js|css)$/.test(path))
    file = [path.slice(1), path.endsWith('.css') ? 'text/css' : 'text/javascript'];
  if (!file) return false;
  let cached = cache.get(file[0]);
  if (!cached) {
    try {
      const bytes = await readFile(new URL(file[0], root));
      cached = {
        bytes,
        etag: '"' + createHash('sha256').update(bytes).digest('hex').slice(0, 24) + '"',
      };
      cache.set(file[0], cached);
    } catch {
      return false;
    }
  }
  if (headers['if-none-match'] === cached.etag) {
    res.writeHead(304, { etag: cached.etag });
    res.end();
    return true;
  }
  res.writeHead(200, {
    'content-type': file[1],
    'content-length': cached.bytes.length,
    etag: cached.etag,
    'cache-control': path.includes('chunk-') ? 'public, max-age=31536000, immutable' : 'no-cache',
    'X-Content-Type-Options': 'nosniff',
  });
  res.end(cached.bytes);
  return true;
}
