# BubbleTasks → Notion backup: what to do next

You already completed Notion setup steps 1–4. The next work is wiring your existing backup button to the Notion API flow.

## 1) Add configuration for Notion token and database ID

Use environment/config values (not hard-coded values in source control):

- `NOTION_API_TOKEN`
- `NOTION_DATABASE_ID`

For browser-only apps, avoid exposing secrets directly. Prefer routing through a backend or serverless endpoint. If this is a single-user desktop app, local machine config is acceptable.

## 2) Wire button click to upload backup JSON

Use `src/notionBackup.js` and bind the button with attribute `data-backup-to-notion`.

Expected app hooks:

- `window.BubbleTasks.exportBackup()` must return a JS object representing your backup JSON.
- `window.BUBBLETASKS_CONFIG.notionToken` and `window.BUBBLETASKS_CONFIG.notionDatabaseId` must be set before clicking the button.

What the upload flow does:

1. Calls Notion `POST /v1/pages` to create a page in your backup database.
2. Titles page with ISO timestamp and sets metadata properties (Created, Device, App Version, Task Count).
3. Splits JSON into chunks and appends code blocks via `PATCH /v1/blocks/{page_id}/children`.

## 3) Verify Notion property names exactly match

The provided code expects these database property names:

- `Name` (title)
- `Created` (date)
- `Device` (rich text)
- `App Version` (rich text)
- `Task Count` (number)

If your names differ, edit the payload keys in `createNotionBackupPage`.

## 4) Restore support

`getMostRecentBackup` is included and performs:

1. Query newest page from the database sorted by `Created` descending.
2. Read page blocks.
3. Join all code block text.
4. Parse JSON and return object + page metadata.

## 5) Manual smoke test checklist

1. Set token + database ID in runtime config.
2. Click your backup button.
3. Confirm new Notion page appears with current timestamp title.
4. Confirm code block body contains your JSON backup.
5. On second device, run restore flow and verify tasks import correctly.
