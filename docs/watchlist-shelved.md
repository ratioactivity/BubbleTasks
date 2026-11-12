# Shelved watchlist and bulk resets

Up Next titles have a Shelve button. Its form accepts an optional reason, then moves that queue entry to the Shelved tab. Entries retain the original title ID, seasons, new/rewatch status, queue notes, rating, and viewing history. Edit shelf note changes the reason. Back to Up Next appends the item to the active queue. Shelf removal uses the same viewing-history preservation as ordinary queue removal.

The existing watchlist queue stores `shelved` (default false) and `shelfNote` per entry. Old saves normalize as active Up Next entries. A shelved, never-watched title is retained in the title library because it still has a queue entry. Both fields are part of normal account sync and backups; no backend deployment or SQL changes are required. Visible queue reordering ignores shelved entries.

Schedule Clear day confirms the displayed date and count, then removes only schedule tasks for that date. It preserves other dates and all native/Google calendar events. It also respects unsaved quick-entry drafts and storage-save failures.

Reset Other checklist confirms deletion of all current Other definitions, retaining recorded daily history. It does not alter Opening, Closing, or weekly tasks. This is independent of sign-out, which still resets checkmarks while retaining shared definitions for guest use.

The activation script no longer creates a button or activation dialog for an already-activated account; activation state and protected data are unchanged.
