# BubbleTasks online sync

The app uses the Supabase `public.bubbletasks_saves` table configured in the SQL Editor. Each row belongs to its authenticated user. The browser uses only the project's public publishable key; row-level security must remain enabled with ownership policies for authenticated users.

## First setup

1. Export a local backup on the device with the most complete save.
2. Choose **Sign in / Create account**. Create an account and confirm its email, or request an email sign-in link. Use the same account on all devices.
3. On the main device, choose **Upload this device’s save**. No local data is uploaded until this explicit choice.
4. On the other devices, sign in and choose **Use online save**. Backup downloads are optional. Enable **Download a backup before replacing a save** if you want a downloaded copy first.

Tasks, archived tasks, Bored List, completion history, agenda, calendar events, and story pins/statuses/notes sync. Layout, selected tab, calendar month, card paging, and weather remain device-local. Check for the **Synced** indicator before switching devices.

The app checks online saves about every 15 seconds while visible, on returning to the tab, and after local changes. Incoming saves reload the app when no text field or dialog is being edited; otherwise **Use online save** appears so the user can finish first. Changes made while signed out remain local until the next sign-in.

## Offline edits and simultaneous changes

All edits are saved locally first. Uploads use a revision comparison to prevent replacing a save that changed after the device last read it. If two versions changed, automatic syncing pauses. Choose **Use online save** to load the online version, or **Upload this device’s save** to replace it deliberately. Both choices can download a backup of the version they replace when **Download a backup before replacing a save** is enabled. This device-local preference defaults to off. There is no automatic merge.

Recent local recovery snapshots are also retained in this browser under `bubbletasks_recovery_v1`. Exported backups contain saves, not login tokens. Signing out keeps the local save on the device.

## Required database setup

The table needs `user_id uuid` (primary key referencing `auth.users`), `data jsonb`, `revision bigint`, and `updated_at timestamptz`. A BEFORE UPDATE trigger must increment revision on every update. Updates use `user_id` and the last known revision together as a compare-and-swap condition. An empty update result represents a concurrent change and never triggers an unconditional retry.

RLS must allow only `auth.uid() = user_id` for reads and writes, and the anonymous role must not have table access. Supabase email authentication must be enabled, with `https://ratioactivity.github.io/BubbleTasks/` as the Site URL and an allowed redirect URL.

## Validation

Browser tests simulate two isolated devices and the Supabase API, including initial upload/download, automatic push/pull, offline changes, conflicts, a revision race, backups, sign-out, token refresh, and email-link callbacks. A real user sign-in is still needed to verify this project's authentication settings and SQL policies. No test signs up a real user or uploads real saves.

