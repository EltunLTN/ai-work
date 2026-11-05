# Arena calendar repair

The tournament form previously converted four unchecked device-local dates and sent them directly to the database. Invalid chronological order surfaced the raw `kairo_tournaments_check` constraint. The constraint stays intact; the admin RPC now validates all four finite timestamps and each ordering rule before selecting questions or inserting a tournament. Existing admin authorization and helper execute restrictions remain intact.

The new form uses explicit Baku (UTC+04:00) calendar values, quick schedules, single-subject eligible template descriptions, separate playoff controls, inline validation and a publication summary. Native date/time inputs provide calendar selection. Async registration may close after the start, but never after the end; playoff registration closes by the start. A stopped or invalid request never creates an arena. The submit request is disabled while pending.

Removed biology laboratories from the catalogue and dynamic component imports (17 laboratories / 5 subject groups remain), and removed source links, provenance panel and source column from university goals. Underlying university records and evidence-status labels remain intact.

Verification: scheduling tests cover Baku conversion, invalid dates, chronology, mode-specific rules, month/year boundaries and all quick presets. A rolled-back database test exercises the authenticated admin RPC for invalid schedules and a valid tournament creation, without leaving a public test arena. UI fixture previews never call production mutation APIs.

