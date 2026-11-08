# Durations count workdays; cascades only push forward; holiday edits don't move tasks

A task's duration is the number of workdays between its start and end. Saturdays, Sundays, organization holidays and that project's holidays are skipped. A move keeps the workday count the same and snaps the start to a workday. With finish-to-start dependencies, a successor is pushed forward only when it would start on or before its predecessor's end. It moves to the next workday after the predecessor finishes. Moving a predecessor earlier never pulls successors back with it.

Adding or removing a holiday does not rewrite any stored task dates. Only the displayed duration changes. A task's dates are recalculated the next time someone edits that task.

## Considered Options

- Re-scheduling every task when a holiday changes was rejected. It would silently move many tasks, possibly across projects, without the user asking for it.
- Pulling successors backward was rejected. Users expect slack they created deliberately to stay put.

## Consequences

- A task that spans a newly added holiday can lose a day the next time it is moved. The README documents this.
- Next-workday-after-predecessor is `snapToWorkday(addDays(pred.endDate, 1))`. The original plan used `addWorkdays(pred.endDate, 1)`, which overshoots by one day when the predecessor ends on a non-workday.
