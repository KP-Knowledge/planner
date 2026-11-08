# Calendar dates are `YYYY-MM-DD` strings; "today" is Asia/Bangkok

Task and holiday dates are calendar days, not instants. They are stored as Postgres `DATE` and handled everywhere as ISO strings (Drizzle `mode: "string"`). Date math uses `Date.UTC` internally and never local-time `Date` objects. "Today" is computed in `Asia/Bangkok`. Without these rules, the server's time zone and each browser's time zone shift dates by a day, especially near midnight UTC, which is already 07:00 in Bangkok.

## Consequences

- Any new date code must go through `src/lib/dates.ts`. Calling `new Date("2026-04-13")` or `toLocaleDateString()` without `timeZone: "UTC"` is a bug.
- The server rejects dates outside the years 2000–2100. One extreme date would otherwise stretch every client's timeline over centuries and freeze the page.
