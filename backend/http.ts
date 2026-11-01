import type { IncomingMessage, ServerResponse } from 'node:http';
export class ApiError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}
export function json(res: ServerResponse, status: number, data: unknown) {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  });
  res.end(JSON.stringify(data));
}
export async function readBody(req: IncomingMessage): Promise<unknown> {
  let raw = '';
  for await (const chunk of req) {
    raw += String(chunk);
    if (Buffer.byteLength(raw) > 16000) throw new ApiError('So‘rov juda katta', 413);
  }
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    throw new ApiError('JSON ma’lumotini tekshiring');
  }
}
export function record(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    throw new ApiError('Ma’lumotlar noto‘g‘ri');
  return value as Record<string, unknown>;
}
