# Opt-in local host routines

The CLI validates a specification. It installs no scheduler and registers no timer. A supported host scheduler must have access to the installed CLI and approved writing store. Do not equate a successful `routine` command with scheduling or execution.

Confirm cadence, timezone, expiry, notification preference and project. Supply JSON through stdin to `routine --project newsletter`:

```json
{"kind":"weekly-report","timezone":"Asia/Karachi","weekday":1,"hour":9,"minute":15,"expiresAt":"2026-10-12T09:15:00+05:00"}
```

Use the user's actual future expiry (within 90 days), not this example. Weekday is 0–6, Sunday–Saturday. `review-reminder` accepts timezone/hour/minute/expiry for a daily reminder. `deadline-reminder` accepts timezone, future `when` ISO timestamp with explicit offset, and expiry after that deadline; no recurring fields. Output is a constrained prompt, cron or UTC one-off time, expiry, `scheduled:false` and `requiresHostScheduler:true`.

Reminders or local reports only: never rewrite, analyze, query balance, send external messages, read arbitrary files or export authentication. Weekly reports stay quiet when no approved receipts exist. Do not infer unpublished drafts or an unfinished session from metadata alone.

Prefer an available documented local Desktop scheduler. Verify the execution environment and bundled report command before creation. Cloud jobs cannot inherit local files/tokens. Do not install a daemon or create another credential store.

If using documented Claude Code session scheduling, explain its session/runtime requirements and lifetime. Current session tools are `CronCreate`, `CronList` and `CronDelete`; verify they are actually available in this host before use. Read back a created task with `CronList`, and use its actual ID for deletion. Recurring session tasks currently expire after seven days and fire only while the session is running and idle; use the earlier of that lifetime and the user's expiry. Recurring fires may be delayed by scheduler jitter. The returned cron is not independently timezone-aware: verify it matches the host's interpreted local timezone. Use a host supporting the exact UTC one-off time for deadlines. Check current scheduler documentation for restart behavior and expiry rather than promising persistence.

Read back actual task identifier, timing/timezone, scope, environment and expiry. If native expiry is unavailable, explain that the prompt's expiry check prevents work but may not delete the timer, and provide pause/delete controls. Do not promise quiet-hours enforcement or automatic deletion unless the host confirms it. Creation failure means not scheduled; do not invent an ID or silently choose another scheduler. Pause/delete through the same host when requested.

Reference: https://code.claude.com/docs/en/scheduled-tasks

This package tests specification validation and local reporting. Actual timer execution must be verified separately in the user's supported host. There is no background scheduler in the package.
