# Google Calendar: one-way display

## Use

Sign in to BubbleTasks, then choose **Connect Google Calendar** and authorize the read-only Calendar permission with the Google account added to the OAuth app's test users. Open Calendar layout to view that account's **primary** calendar. Google entries have a separate Google/read-only label; their edit link opens Google Calendar. Native BubbleTasks events remain independently editable.

The visible date range loads when the month changes and refreshes about once a minute while the calendar is visible. **Refresh Google events** checks immediately. Changes and deletions made in Google appear after a successful refresh. Loaded ranges are cached in memory only, kept separate from local saves, task backups, and BubbleTasks cloud snapshots. Google event times follow the viewing device's time zone; all-day end dates are exclusive, and multi-day entries appear on each applicable date.

**Disconnect Google** removes the backend connection and the Google entries from this view. It does not delete events in either calendar. Google access can also be revoked in the Google account's third-party connection settings. If access expires, the UI offers Reconnect. External Google OAuth apps left in Testing can require reconnection after seven days.

## Backend deployment

The function source is `supabase/functions/google-calendar-auth/index.ts`. It is deployed separately in Supabase under **google-calendar-auth**. The Google web OAuth client must have this exact redirect URI:

`https://ejrnkaigdstalaypyhhp.supabase.co/functions/v1/google-calendar-auth`

Configure `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in Supabase Edge Function Secrets. Do not put the client secret or Google tokens in browser code, GitHub, or task saves. Supabase provides `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to the function.

Disable gateway **Verify JWT** for this function because Google's OAuth callback has no Supabase JWT. All app actions separately validate their Supabase bearer token through `/auth/v1/user`. The callback requires a one-time, hashed OAuth state with a ten-minute expiry and uses PKCE. Google refresh tokens live in the backend-only `google_calendar_connections` table. `google_calendar_oauth_states` is also backend-only. Both tables must have RLS enabled, no grants to public/anon/authenticated, and service-role access only. See the migration for the setup previously run manually.

The OAuth scope is `https://www.googleapis.com/auth/calendar.events.readonly`. Google authorization and token exchange occur only through Google's HTTPS endpoints. App actions are status, connect, disconnect, and a bounded events read. The function never calls Google event mutation APIs and never returns Google tokens to the browser. Calendar reads cover at most 93 days and cap paginated results, reporting partial results rather than silently claiming completeness.

`BubbleTasksCloud` shares the existing session refresh mechanism with the calendar client, avoiding independent competing refreshes. Account-change events clear Google caches immediately, and responses from older account generations are ignored. CORS is restricted to `https://ratioactivity.github.io`.

## Validation

Backend tests simulate user authentication, read-only scope, PKCE, expiring/one-use state, token privacy, range limits, and disconnect. Browser tests simulate month fetching/caching, read-only entries, all-day exclusive ends, overnight times, deduplication, safe Google links, reconnect errors, consent navigation, and sign-out/account changes during an in-flight request. These do not replace the owner's first live Google consent and function-deployment check.
