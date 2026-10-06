import express, { type NextFunction, type Request, type Response } from 'express';
import helmet from 'helmet';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { handleImage, handleNews, handleSummarize, type ApiResult, type Body } from './server/handlers.js';

// Secrets live in .env.local / .env (git-ignored). Real environment variables win.
for (const file of ['.env.local', '.env']) {
  try {
    process.loadEnvFile(file);
  } catch {
    /* file missing or unsupported Node version: fall back to the real environment */
  }
}

// Secure by default: dev mode (Vite middleware, no CSP) must be requested explicitly.
const isDev = process.env.NODE_ENV === 'development' || process.argv.includes('--dev');
process.env.NODE_ENV = isDev ? 'development' : 'production';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 3000;

const app = express();
app.disable('x-powered-by');

// ---------------------------------------------------------------------------
// Security headers
// ---------------------------------------------------------------------------
const frameAncestorsEnv = process.env.FRAME_ANCESTORS?.trim();
const frameAncestors = frameAncestorsEnv
  ? frameAncestorsEnv.split(/\s+/).filter(token => /^[\w:'.*/-]+$/.test(token))
  : ["'self'"];

if (isDev) {
  // Vite's dev client needs inline scripts and websockets, so no CSP here. Framing stays possible
  // because AI Studio previews embed the app.
  app.use(
    helmet({
      contentSecurityPolicy: false,
      frameguard: false,
      hsts: false,
      crossOriginOpenerPolicy: false,
      crossOriginResourcePolicy: false,
    }),
  );
} else {
  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: false,
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'"],
          imgSrc: ["'self'", 'https://images.unsplash.com'],
          fontSrc: ["'self'"],
          connectSrc: ["'self'"],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
          frameAncestors,
        },
      },
      frameguard: frameAncestorsEnv ? false : { action: 'sameorigin' },
      hsts: { maxAge: 15_552_000, includeSubDomains: false },
      referrerPolicy: { policy: 'no-referrer' },
    }),
  );
}
app.use((_req, res, next) => {
  res.setHeader(
    'Permissions-Policy',
    'geolocation=(self), camera=(), microphone=(), payment=(), usb=(), interest-cohort=()',
  );
  next();
});

// ---------------------------------------------------------------------------
// API hardening: no caching, small JSON bodies, generic errors
// ---------------------------------------------------------------------------
app.use('/api', (_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});
app.use(express.json({ limit: '100kb' }));

// ---------------------------------------------------------------------------
// Routes (logic lives in server/handlers.ts, shared with the Vercel functions in /api)
// ---------------------------------------------------------------------------
const bodyOf = (req: Request): Body =>
  req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? (req.body as Body) : {};

const route = (fn: (body: Body) => Promise<ApiResult> | ApiResult) => async (req: Request, res: Response) => {
  const { status, json } = await fn(bodyOf(req));
  res.status(status).json(json);
};

app.post('/api/news', route(handleNews));
app.post('/api/summarize', route(handleSummarize));
app.post('/api/generate-image', route(handleImage));

// Unknown API routes: JSON 404 (never fall through to the SPA)
app.use('/api', (_req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found.' });
});

// ---------------------------------------------------------------------------
// Static assets / Vite
// ---------------------------------------------------------------------------
async function startServer() {
  if (!isDev) {
    const distDir = path.resolve(__dirname, 'dist');
    const indexFile = path.join(distDir, 'index.html');
    if (!fs.existsSync(indexFile)) {
      console.error('dist/index.html not found. Run "npm run build" before starting in production mode.');
      process.exit(1);
    }
    app.use(
      express.static(distDir, {
        index: false,
        setHeaders: (res, filePath) => {
          // Vite fingerprints everything under /assets, so it is safe to cache forever.
          if (filePath.includes(`${path.sep}assets${path.sep}`)) {
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
          }
        },
      }),
    );
    app.get('/{*splat}', (_req: Request, res: Response) => {
      res.setHeader('Cache-Control', 'no-cache');
      res.sendFile(indexFile);
    });
  } else {
    // Vite's dev server serves any file under the project root, including server code and secrets.
    const BLOCKED = /^\/(server\.ts|server\/|\.env|\.git|bun\.lock|package-lock\.json)/i;
    app.use((req: Request, res: Response, next: NextFunction) => {
      let pathname = req.path;
      try {
        pathname = decodeURIComponent(req.path);
      } catch {
        return res.status(400).end();
      }
      if (BLOCKED.test(pathname)) return res.status(404).end();
      next();
    });
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  // Never leak stack traces, file paths or parser internals.
  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    if (res.headersSent) return next(err);
    const status = Number(err?.status ?? err?.statusCode);
    if (status === 413) return res.status(413).json({ error: 'Request body too large.' });
    if (status >= 400 && status < 500) return res.status(400).json({ error: 'Invalid request.' });
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Briefly server running on http://0.0.0.0:${PORT} (${isDev ? 'development' : 'production'})`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
