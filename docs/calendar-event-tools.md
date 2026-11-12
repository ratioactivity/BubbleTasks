# Calendar notes, hiding and tracker timing

Native and imported Google event bubbles have Note and Hide controls. Notes and hidden flags are stored independently under `calendarEventExtras` in the shared save, keyed by native ID or Google user/occurrence ID. Google refreshes cannot overwrite these local annotations. They follow normal account sync and backups. A Hidden events button lists hidden entries and permits restoring or editing notes. Hiding is visual in the month calendar: it does not change Google, delete an event, remove it from Schedule/Tracker, or subtract work hours. Guest workspaces retain their own metadata, separate from account data.

Mood, pain and symptom forms offer Specific time, All day and Sporadic. Old entries default to Specific time. The `timeMode` field survives normalization, backups and cloud sync; an internal timestamp still anchors each reading to its date. All visible reading labels and downloaded summaries use the selected timing label, and numeric averages still count each reading once.

For Notion exports, redeploy the updated `supabase/functions/daily-tracker-sync/index.ts` as `daily-tracker-sync`, retaining its current secrets/settings. The function is still bundled as one file and needs no SQL changes. Non-specific readings use a date-only Timestamp and include All day/Sporadic in Notes and the daily summary. Existing entries update by the same entry key.

The task controller migrates legacy Other categories and the selected tab to 3D. Other Writing and the Details checklist's Other tab retain their existing meanings. The top task form stays in the DOM for the shared task controller but is permanently hidden; card plus buttons are the visible creation interface.

Checks: `tests/batch-planner-browser.cjs`, daily tracker model/function/browser suites, Google event refresh suite, and real account/guest isolation suite.
