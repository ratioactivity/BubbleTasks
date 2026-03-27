# BubbleTasks

BubbleTasks is a React + TypeScript task organizer with a soft pastel UI, category boards/tabs, archive management, and optional Supabase persistence.

## 1) Setup

```bash
npm install
```

Create `.env.local` (optional for Supabase):

```bash
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_APP_BASE_URL=/
```

### Environment variable behavior

- If `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set, BubbleTasks uses Supabase persistence.
- If either is missing, BubbleTasks gracefully falls back to localStorage.
- `VITE_APP_BASE_URL` controls the deployed base path (keep `/` for root deployments).

## 2) Run locally

```bash
npm run dev
```

## 3) Production build

```bash
npm run build
npm run preview
```

Vite build config is set for deployment-oriented output (`es2020` target, production assets directory, preview host/port config).

## 4) Supabase database setup (optional)

1. Create a Supabase project.
2. Open SQL Editor.
3. Run `supabase/schema.sql`.

This creates:
- `tasks`
- `bored_tasks`
- `settings`

## 5) Deploy instructions

### Netlify
- Build command: `npm run build`
- Publish directory: `dist`
- SPA fallback is configured via `public/_redirects`.

### Vercel
- Framework preset: Vite
- Build command: `npm run build`
- Output directory: `dist`
- SPA fallback is configured via `vercel.json`.

### Other static hosts
- Serve `dist` as static files.
- Configure rewrite fallback to `index.html` for SPA routes.

## 6) Notion embed

1. Deploy BubbleTasks to a public HTTPS URL.
2. In Notion, type `/embed`.
3. Paste your deployed BubbleTasks URL.
4. Resize the embed block width as needed.

The app is responsive for both full browser width and narrower embed widths.

## 7) Assets and fonts

Assets and fonts live in the repository root at `/assets` and `/fonts` and are referenced directly by the app.
`icon128.png` is used for favicon and metadata, while custom fonts are loaded from `/fonts`.
