# Personal task categories and generic workspaces

Writing and 3D are visible only when the current account's personal features are activated. Non-activated accounts and guests see the five regular categories plus one renameable category, initially Fill in your own. Name category opens a prompt; the chosen name is saved as `customCategoryLabel`, included in account sync and backups. Guest names stay in the separate local guest workspace.

Custom tasks use the stable Custom key. Display names never become task category IDs; card plus controls and edit prompts resolve display names separately. Existing Writing and 3D task categories are preserved in storage and grouped under the generic category while personal features are off. Their story chips are hidden. Merely accepting the unchanged generic category in the edit prompt does not rewrite their original category. Renaming never rewrites tasks or story data.

No story cards, banners, Notion story links or story-picker options are rendered outside personal mode. Empty generic workspaces do not receive predefined story-details records. The existing cached story details are retained for restoration after activation. This uses the existing UI activation gate, not encrypted storage or new server authorization.

Activated accounts regain Writing and 3D. If a custom name or Custom tasks already exist, the custom category also remains available so those tasks are not stranded. Other Writing and the Details Other checklist are unaffected.

Validation: real account/guest activation and cross-device tests, plus a generic-category browser test covering legacy task preservation, renaming, plus/edit controls, backups/reloads and mobile layout. No Supabase function or SQL change is needed.
