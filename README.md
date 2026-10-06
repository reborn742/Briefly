# Briefly.

AI news briefing app (React + Vite frontend, Express + Gemini backend).

## Run locally
1. `bun install` (or `npm install`)
2. Copy `.env.example` to `.env.local` and set `GEMINI_API_KEY` (server-side only, git-ignored)
3. `npm run dev`

## Production
```
npm run build
npm start        # production mode: strict CSP, security headers, no Vite dev server
```

## Deploy on Vercel
The `api/` folder holds the serverless endpoints (same code as `server.ts`); `vercel.json` sets the security headers.
1. Push to GitHub and import the repo in Vercel (Vite is auto-detected).
2. Add the environment variable `GEMINI_API_KEY` in Project Settings, then redeploy.
(`server.ts` is only used for local dev and Node hosts; Vercel does not run it.)

- To embed the app in an iframe, set `FRAME_ANCESTORS` (see `.env.example`).
- `npm run lint` typechecks; `npm run test:security` runs the input-sanitiser tests.
