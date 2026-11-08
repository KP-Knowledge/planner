# Hand-built React + SVG Gantt instead of a Gantt library

The Gantt chart is our own React + SVG code (`src/features/gantt/`), not a library. The UI has to match Instagantt closely in both light and dark themes, and we need full control over workday snapping, holiday shading and dependency arrows. The free libraries (`frappe-gantt`, `gantt-task-react`) can't be themed or extended far enough, and the full-featured ones (DHTMLX, Bryntum) need a paid license.

## Consequences

- Drag, resize, dependency linking, reordering and keyboard support are all our code to maintain.
- Performance is our responsibility. Background shading uses one rect per non-working day and small repeating SVG pattern tiles, never canvas-sized tiles (those break past the 16384px texture limit at about 500 tasks).
