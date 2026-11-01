import type { PlaceResult } from '../shared/types.ts';
import { ApiError } from './http.ts';
interface SearchResult {
  display_name: string;
  lat: string;
  lon: string;
}
const cache = new Map<string, PlaceResult[]>();
let lastSearch = 0;
export async function findPlaces(query: string): Promise<PlaceResult[]> {
  const q = query.trim();
  if (q.length < 3 || q.length > 160) throw new ApiError('Kamida 3 ta harf yozing');
  const cached = cache.get(q);
  if (cached) return cached;
  if (Date.now() - lastSearch < 1100) throw new ApiError('Bir soniyadan keyin qayta qidiring', 429);
  lastSearch = Date.now();
  try {
    const upstream = await fetch(
      'https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&q=' + encodeURIComponent(q),
      {
        headers: {
          'User-Agent': 'LumaInvitations/1.0 (interactive meeting location search)',
          'Accept-Language': 'uz,en',
        },
        signal: AbortSignal.timeout(12000),
      },
    );
    if (!upstream.ok) throw Error();
    const data = (await upstream.json()) as SearchResult[];
    const results = data.map((p) => ({
      name: p.display_name,
      lat: Number(p.lat),
      lng: Number(p.lon),
    }));
    if (cache.size > 300) cache.clear();
    cache.set(q, results);
    return results;
  } catch {
    throw new ApiError('Qidiruvga ulanib bo‘lmadi. Xaritani surib joy tanlang.', 503);
  }
}
