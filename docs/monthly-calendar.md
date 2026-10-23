# Monthly calendar

The former Day layout is now Calendar. Cycle the Layout button from Columns to Tabs to Calendar. The internal saved layout value remains `day` so existing saves remain compatible.

Use Previous month, Next month, Today, or the month picker to navigate. The viewed month is remembered on this device; past events are kept until explicitly deleted. Each date's + opens an event form for that date. Events may be all-day or have a start time and optional same-day end time. Click an event's displayed time to edit, with the start-time field focused automatically. Events do not automatically repeat annually.

Colors:

- Birthdays & Holidays: `#ff9999`
- Family & Friends: `#ffca99`
- Appointments: `#ffe799`
- Work: `#c2ff99`
- Business & Creative Goals: `#99ffda`
- Reminders & Tasks: `#99ceff`
- Miscellaneous Events: `#af99ff`

Tasks with valid due dates appear on their respective dates. Completed dated tasks from the archive remain visible with a completion label and struck-through title. Undated tasks are omitted. Event times and dates use local calendar values and are not converted to UTC. On narrow screens, scroll the calendar horizontally; the rest of the app stays within the screen.

Events are stored under `calendarEvents` in the normal local save and included in cloud snapshots. No database schema change is needed because the cloud save uses JSON. New backups include events; importing an older backup without calendar data preserves the device's existing events. Importing a new backup with an empty events array clears events explicitly.

Implementation: `monthly-calendar.js` enhances the original Day renderer, preserves the latest events when the legacy task code saves, and routes backup export/import through the existing save format. It must load after `cloud-sync.js`, so local calendar writes flow through the cloud-save listener. Online downloads bypass the local wrapper and reload, initializing the calendar from the downloaded save.

Validation includes leap-month day placement, all-day and timed events, editing times, month navigation/history, dated/undated/completed tasks, preservation through unrelated task saves, backup restore/delete, narrow-screen scrolling, and simulated two-device event/time syncing.
