# Day dashboard and Notion uploads

Open **Day** beside Layout. Calendar and Notes remain available. Each widget saves independently. Mood and pain are timestamped 1–10 readings. Blank means unrecorded, not zero. The header follows average mood in a pastel purple-to-pink rainbow.

Sleep belongs to the day you wake up. Store explicit dates and times: after-midnight bedtimes use the wake-up date; before-midnight bedtimes use the previous date. UTC instants preserve elapsed sleep across daylight-saving transitions.

Symptoms offer inline phrase completion, a remembered body-area group, and optional severity/note. The twelve groups match Notion. Activities, artists, genres, interests, and watching entries also offer inline completion. Interests distinguish “On my mind” and “Worked on,” with progress notes and dated history. Writing cards have a history button for the same story.

Artist genres are reusable defaults; each song can override them. Editing an artist's defaults queues affected days for re-upload. Song of the Day becomes the day title; otherwise Notion uses the date.

Saved daily summaries can be downloaded as text. Day records and reusable artists/tags are stored under dailyTracker in the normal JSON save, so existing online sync and backups include them. Older backups without dailyTracker preserve current daily data. Unsaved text widgets remain intact when another entry is added; save or discard them before switching dates.

## Supabase setup — required before Notion uploads work

The function is prepared, but there is no live Notion backend until the owner deploys it.

1. Run supabase/migrations/20261031000000_daily_tracker_notion_locks.sql in the SQL editor. Backend-only leases serialize uploads across devices and dates. RLS is enabled; public, anon, and authenticated roles cannot access this table or its RPC functions.
2. Add Edge Function secrets:
   - NOTION_TOKEN: the internal integration token, already saved privately by the owner.
   - NOTION_OWNER_USER_ID: the UUID of the authorized BubbleTasks account. Sign in and open Day → Notion uploads → Connection setup to copy it. This is a user ID, not an email or Notion workspace ID.
3. Create an Edge Function named **daily-tracker-sync**. Paste the complete supabase/functions/daily-tracker-sync/index.ts file into the editor and deploy. The source is self-contained. Disable the gateway's **Verify JWT** setting: the function validates the bearer session through Supabase Auth itself, then checks the configured owner UUID before accessing Notion.
4. The BubbleTasks internal Notion integration needs Read, Insert, and Update content permissions and a connection to the tracker parent page. The child databases inherit that access.
5. Refresh BubbleTasks, save a day, wait for online sync to show **Synced**, and click **Upload this date now**. Enable automatic uploads if desired.

The function uses the standard Supabase-provided SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY. Neither those secrets nor the Notion token belongs in browser code, GitHub, or backups.

CLI alternative: supabase functions deploy daily-tracker-sync --project-ref ejrnkaigdstalaypyhhp --no-verify-jwt

## Notion destination

Parent page: 40a86c3b-b6b9-80d0-ada2-d420099954f5

| Database | Database ID | Data source ID |
| --- | --- | --- |
| Daily Log | e26dc4cd-387e-4baa-ba41-28c2800a6138 | 246162c5-d30d-44a2-a04b-8fdc269ff8a5 |
| Readings | c88d6926-5448-4daa-a6be-983d98cf05c1 | 96298643-8f41-4d97-b0fc-bd3f9282915c |
| Artists | ff9c5bb3-bf7a-45a9-8b66-3b3bee9ea33c | 59385886-0371-4790-b157-fbf889570be8 |

The backend reads the latest online bubbletasks_saves row for the authenticated owner. Requests select a date; client-submitted health data is not the source of truth. Stable Log Key and Entry Key properties identify existing pages and readings. Updates preserve unrelated properties and page content. A managed paragraph contains the daily summary. Removing a reading in BubbleTasks archives only the corresponding integration-created reading.

Artist Genres rolls up from Artists. Song Genres stores the day's effective genres. Notion uses its native named colors for Mood Color; BubbleTasks renders the precise pastel palette.

Uploads run only when opted in for the signed-in account and after the online save reports Synced. Unacknowledged revisions are retried while the app is open. Failures leave saved data intact. This is one-way BubbleTasks → Notion: edits in Notion do not edit BubbleTasks, and later uploads can replace mapped fields.

## Validation

Run node tests/daily-tracker-model.cjs and node tests/daily-tracker-function.cjs.

Run node tests/daily-tracker-browser.cjs with Playwright and Chromium installed; PLAYWRIGHT_MODULE can select another Playwright installation.

Function tests mock authentication, owner isolation, fail-closed configuration, canonical saved input, repeated uploads, deleted readings, artist reuse, unrelated block preservation, concurrent leases, and retries. Browser tests cover all widgets, autocomplete/group recall, history, average mood, sleep, drafts, backups, mobile sizing, and two-device sync. Tests never send real health entries.

The Edge Function bundles an exact copy of daily-tracker-model.js for Supabase's single-file editor. Keep that model prefix synchronized; the function test checks equality.
