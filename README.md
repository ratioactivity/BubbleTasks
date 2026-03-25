# BubbleTasks

BubbleTasks is a React + TypeScript task organizer with local-first behavior and optional Supabase persistence.

## Supabase setup (optional)

If Supabase env vars are provided, the app uses Supabase for persistence. If not, it gracefully falls back to localStorage.

### Required environment variables

Create a `.env.local` file in the project root with:

```bash
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Database setup steps

1. Create a Supabase project.
2. Open SQL Editor in Supabase.
3. Run the schema from `supabase/schema.sql`.
4. Start the app; it will automatically use Supabase when env vars are present.

### Fallback behavior

When env vars are missing, BubbleTasks stores state in localStorage so local development still works across sessions without backend setup.
