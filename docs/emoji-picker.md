# Emoji picker

The three header stars form one keyboard-accessible button that opens the Emoji Bubble dialog. Click an emoji to copy it, then paste normally. The picker stays open for repeated copying. Search names or emoji characters, filter categories, or browse Recent and Favorites. Each tile's star toggles its favorite status.

Up to 36 recently copied emojis and favorites are saved in browser storage under `bubbletasks_emoji_picker_v1:account:<id>` or the separate guest key. Preferences are local to the device, outside task saves, cloud sync and backups. No third-party emoji service or network request is needed. Rendering uses the device's emoji font, so newer characters may vary across devices.

If clipboard permission is denied, a legacy copy attempt is made. If that also fails, a selected read-only emoji field permits manual copying. Failed copies do not enter Recents. Preference storage failures retain the session's choices and show a message.

Run `node tests/emoji-picker-browser.cjs` for copy/search/category behavior, recents/favorites persistence, account separation, clipboard fallback, keyboard focus and mobile geometry.
