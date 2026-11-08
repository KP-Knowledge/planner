# Thai holidays are seeded from `date-holidays` into the DB and stay editable

Thai public holidays come from the `date-holidays` package (country `TH`). For each year they are copied into the `holidays` table with `source = 'seed'`. At container start, the current year and the next year are seeded automatically. A year is seeded only if it has no seed rows yet, so a seed row someone deleted stays deleted. Every row can be edited or removed, and organization or project holidays can be added.

We chose this over the Bank of Thailand holiday API, which needs an API key and only covers financial-institution holidays. We also didn't want the app to depend on a remote service at runtime.

## Consequences

- In `date-holidays` 3.38.0, the TH data has no Buddhist holidays (Makha Bucha, Visakha Bucha, Asahna Bucha, Buddhist Lent) from 2027 onward, and no substitution days in any year. Someone has to add these through the Holidays drawer, which shows a banner about it. We do not try to compute lunar dates ourselves.
- If someone moves a seeded holiday to another date and then re-imports that year, the original date is added again.
