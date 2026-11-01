import http from 'node:http';
import { handleApi } from './routes.ts';
import { serveStatic } from './static.ts';
import { ApiError, json } from './http.ts';
import { runBot } from './telegram.ts';
const port = Number(process.env.PORT || 3000);
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', 'http://localhost');
    if (await handleApi(req, res, url)) return;
    if (req.method === 'GET' && (await serveStatic(url.pathname, res, req.headers))) return;
    json(res, 404, { error: 'Topilmadi' });
  } catch (error) {
    if (!res.headersSent)
      json(res, error instanceof ApiError ? error.status : 400, {
        error: error instanceof ApiError ? error.message : 'So‘rovni bajarib bo‘lmadi',
      });
    else res.end();
  }
});
server.listen(port, () => console.log(`Luma: http://localhost:${port}`));
void runBot();
