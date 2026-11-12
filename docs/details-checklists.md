# Details checklists and shared-device workspaces

Checklist definitions, ordering, completion dates, notes, and daily logs are stored under `detailsChecklists` in the shared save. No predefined work tasks are shipped.

Opening and Closing checks use local calendar dates; Other stays checked until manually reset. Reset Other checklist removes every current Other item (checked or unchecked), with confirmation; it retains recorded history and leaves Opening, Closing, and weekly cleaning definitions alone. Logging an action captures the day's complete checklist, including that weekday's cleaning tasks. Daily logs retain their task titles after a definition is deleted or renamed on a later date. Historical checks and notes can be corrected without changing a different day's checks.

Older saves retain only the most recent completion date per item. Migration recovers those known facts and marks such logs as partial. Users can explicitly add missing tasks from the current setup; this is labeled as a template rather than a reconstruction of the original day.

The Details header has a Reorder tasks toggle, separate from compact mode. Drag grips and up/down controls appear only while reordering is on; the same toggle is available in weekly settings. Weekly rules are ordered separately. Completion notes are optional and can be attached to unchecked tasks to record why they were skipped.

## Signed-out guest workspace

`workspaces.js` loads before cloud sync and all feature state controllers. Signing out archives the current account's local save, switches to a separate guest save, resets checklist checks, and reloads the state controllers. Guest tasks, events, notes, watch history, and checklist logs stay local and are never automatically uploaded or merged into the account.

Only work checklist definitions carry across. Existing guest-only checklist customizations are preserved; unchanged shared definitions can receive the account's newer wording, and new account definitions are added. Account completion notes and daily logs never enter the guest copy.

Tracker, Bubblemarks, and the personal Notion Home shortcut are unavailable in guest mode. Guest backups contain only the active guest save. Legacy Bubblemarks storage keys are removed while signed out and restored with the appropriate account.

Supabase validates sign-in before the matching account workspace is restored. Switching workspaces reloads every controller so stale account data cannot be saved into the guest workspace. Storage failures cancel the switch and preserve the prior save. Guest and account caches are ordinary browser storage, not encryption or a security boundary against someone inspecting that browser profile.

Feature browser tests mock an account workspace. `tests/details-history-workspaces.cjs` exercises the real workspace transitions, privacy checks, failure rollback, historical corrections, and cross-device history sync.

## Personal feature activation

`personal-features.js` hides Bubblemarks, Daily Tracker (including writing-card daily work history), and the entire Today's Agenda card unless `personalFeatures` is enabled for the current account ID. Existing data stays in the account save while locked; the agenda is not rolled over or reset until activated. The toolbar activation dialog sends the code to the authenticated Supabase function for verification and stores an account-bound activation record, included in normal cloud sync and backups. A copied activation record cannot enable a different account in the UI. Guest mode always remains locked.

This is a feature visibility gate, not encryption or server-enforced authorization. A person inspecting source or browser storage can bypass it. The activation code itself is not stored in public source or the save. Set the Supabase secret `PERSONAL_FEATURES_PASSWORD` and deploy `supabase/functions/personal-features-activate/index.ts` (JWT verification off: the function validates the Bearer token against Supabase Auth itself). No migration is required. Run the real workspace/activation test with `BT_TEST_ACTIVATION` set to the configured code; feature-only fixtures stub activation.
