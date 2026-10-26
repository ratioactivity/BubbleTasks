# Google Calendar: add-only imports

## Use

Sign in to BubbleTasks, then choose **Connect Google Calendar** and authorize the read-only Calendar permission with the Google account added to the OAuth app's test users. Open Calendar layout to view that account's **primary** calendar. Google entries have a separate Google/read-only label; their edit link opens Google Calendar. Native BubbleTasks events remain independently editable.

Each Google event has a small clickable color dot in its top-right corner using the same seven categories as BubbleTasks events. This changes only its BubbleTasks appearance; event contents and colors in Google are untouched. Choose Default Google color to remove an assignment. These per-event category choices are included in task sync and backups under `googleEventCategories`. Imported Google event snapshots are saved separately under `googleEventImports`, scoped to the signed-in BubbleTasks user, and included in sync and backups too. Google access and refresh tokens are never included. The picker remains visible in Compact mode. Recurring occurrences use their individual Google event IDs; multi-day instances share one category across their displayed dates.

The visible date range loads when the month changes and refreshes about once a minute while the calendar is visible. **Refresh Google events** checks immediately. Refreshes only append previously unseen Google event IDs. Once imported, an event's title, dates, and times stay unchanged even if Google later edits or removes it. BubbleTasks-native events and category choices are never replaced by a Google refresh. Empty or partial responses cannot remove imported events. Fetch timestamps are cached in memory; saved snapshots do not expire and render immediately when signed in, even before a connection check succeeds. Only events in visited calendar ranges are imported. Google event times follow the viewing device's time zone; all-day end dates are exclusive, and multi-day entries appear on each applicable date.

**Disconnect Google** removes the backend connection and stops new imports. Previously imported events and their category colors remain available to the same signed-in BubbleTasks user. It does not delete events in either calendar. Google access can also be revoked in the Google account's third-party connection settings. If access expires, the UI offers Reconnect. External Google OAuth apps left in Testing can require reconnection after seven days.

## Backend deployment

The function source is `supabase/functions/google-calendar-auth/index.ts`. It is deployed separately in Supabase under **google-calendar-auth**. The Google web OAuth client must have this exact redirect URI:

`https://ejrnkaigdstalaypyhhp.supabase.co/functions/v1/google-calendar-auth`

Configure `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in Supabase Edge Function Secrets. Do not put the client secret or Google tokens in browser code, GitHub, or task saves. Supabase provides `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to the function.

Disable gateway **Verify JWT** for this function because Google's OAuth callback has no Supabase JWT. All app actions separately validate their Supabase bearer token through `/auth/v1/user`. The callback requires a one-time, hashed OAuth state with a ten-minute expiry and uses PKCE. Google refresh tokens live in the backend-only `google_calendar_connections` table. `google_calendar_oauth_states` is also backend-only. Both tables must have RLS enabled, no grants to public/anon/authenticated, and service-role access only. See the migration for the setup previously run manually.

The OAuth scope is `https://www.googleapis.com/auth/calendar.events.readonly`. Google authorization and token exchange occur only through Google's HTTPS endpoints. App actions are status, connect, disconnect, and a bounded events read. The function never calls Google event mutation APIs and never returns Google tokens to the browser. Calendar reads cover at most 93 days and cap paginated results, reporting partial results rather than silently claiming completeness.

`BubbleTasksCloud` shares the existing session refresh mechanism with the calendar client, avoiding independent competing refreshes. Account-change events clear fetch caches immediately, hide snapshots belonging to another user, and ignore responses from older account generations. CORS is restricted to `https://ratioactivity.github.io`.

## Validation

Backend tests simulate user authentication, read-only scope, PKCE, expiring/one-use state, token privacy, range limits, and disconnect. Browser tests simulate month fetching/caching, read-only entries, all-day exclusive ends, overnight times, deduplication, safe Google links, reconnect errors, consent navigation, and sign-out/account changes during an in-flight request. Add-only tests also simulate changed/deleted events, empty responses, duplicate reads, reloads, backups, disconnects, and transfers to a second device. These do not replace the owner's first live Google consent and function-deployment check.

