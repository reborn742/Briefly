import type { ApiResult, Body } from './handlers.js';

const MAX_BODY_CHARS = 100_000;
const HEADERS = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };

/** Adapts a framework-independent handler to a Vercel Function (Web Request/Response). */
export const vercelHandler =
  (fn: (body: Body) => Promise<ApiResult> | ApiResult) =>
  async (request: Request): Promise<Response> => {
    let body: Body = {};
    try {
      const text = await request.text();
      if (text.length > MAX_BODY_CHARS) {
        return Response.json({ error: 'Request body too large.' }, { status: 413, headers: HEADERS });
      }
      const parsed: unknown = text ? JSON.parse(text) : {};
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) body = parsed as Body;
    } catch {
      return Response.json({ error: 'Invalid request.' }, { status: 400, headers: HEADERS });
    }
    const { status, json } = await fn(body);
    return Response.json(json, { status, headers: HEADERS });
  };

export const methodNotAllowed = (): Response =>
  Response.json({ error: 'Method not allowed.' }, { status: 405, headers: { ...HEADERS, Allow: 'POST' } });
