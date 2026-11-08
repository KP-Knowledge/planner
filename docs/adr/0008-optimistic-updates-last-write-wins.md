# No real-time sync: optimistic updates, refetch on focus, last write wins

The app has no WebSocket or server-sent events. Every edit updates the TanStack Query cache optimistically, then the server's response replaces it. The data is refetched when the window regains focus. When two people edit the same task, the later write wins. Real-time sync would have added a stateful connection layer and made the Dokploy deployment harder for a small team tool.

All Gantt mutations for a project share one `mutationKey`. Only the last mutation to settle restores its snapshot on error or triggers a refetch. Without that, overlapping edits could resurrect a failed edit or overwrite a newer one with a stale response.

## Consequences

- Two users editing the same project don't see each other's changes until they refocus the window or reload the page.
- The task modal compares the draft against the task as it was when the modal opened, so a background refetch doesn't mark the form as changed or overwrite someone else's edit.
- Dependency creation takes a per-project advisory lock, so two requests running at the same time can't create a cycle together.
