import type { IncomingMessage, ServerResponse } from 'node:http';
import { createInvitation, findInvitation, setResponse } from './db.ts';
import { json, readBody, record, ApiError } from './http.ts';
import { validateInvitation } from './validation.ts';
import { getBotName } from './telegram.ts';
import { findPlaces } from './places.ts';
import { renderPaper } from './card.ts';
import { handleAnalytics } from './analytics.ts';
export async function handleApi(
  req: IncomingMessage,
  res: ServerResponse,
  url: URL,
): Promise<boolean> {
  if (await handleAnalytics(req, res, url)) return true;
  if (req.method === 'GET' && url.pathname === '/api/config') {
    json(res, 200, { botName: getBotName() });
    return true;
  }
  if (req.method === 'GET' && url.pathname === '/api/places') {
    json(res, 200, await findPlaces(url.searchParams.get('q') || ''));
    return true;
  }
  if (req.method === 'POST' && url.pathname === '/api/invitations') {
    json(res, 201, createInvitation(validateInvitation(await readBody(req))));
    return true;
  }
  const match = url.pathname.match(/^\/api\/invitations\/([a-f0-9]{24})(\/response|\/paper.png)?$/);
  if (!match) return false;
  const item = findInvitation(match[1]);
  if (!item) throw new ApiError('Taklifnoma topilmadi', 404);
  if (req.method === 'GET' && match[2] === '/paper.png') {
    const png = await renderPaper(item);
    res.writeHead(200, {
      'content-type': 'image/png',
      'content-disposition': 'inline; filename="luma-taklifnoma.png"',
      'cache-control': 'private, max-age=3600',
    });
    res.end(png);
    return true;
  }
  if (req.method === 'GET' && !match[2]) {
    const { secret, ...publicItem } = item;
    json(res, 200, publicItem);
    return true;
  }
  if (req.method === 'POST' && match[2] === '/response') {
    const body = record(await readBody(req));
    if (body.response !== 'yes' && body.response !== 'no') throw new ApiError('Javob noto‘g‘ri');
    setResponse(item.id, body.response);
    json(res, 200, { ok: true });
    return true;
  }
  return false;
}
