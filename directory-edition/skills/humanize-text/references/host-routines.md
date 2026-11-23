# Opt-in host routines

You build and check a reminder specification yourself, then create it only with an actually available host scheduler after the user approves it. The plugin installs no scheduler and registers no timer. A specification is never proof of scheduling or execution.

## 1. Collect and validate

Confirm cadence, timezone, expiry, notification preference and project. Reject anything that fails a rule below and explain why.

| Field | Rule |
| --- | --- |
| kind | Exactly one of `weekly-report`, `review-reminder`, `deadline-reminder`. Refuse anything else, especially any routine that would rewrite, analyze or check allowance in the background |
| project | A scope name (lowercase letter first, then lowercase letters, digits or hyphens; at most 64 characters). Default `global` |
| timezone | An IANA name such as `Asia/Karachi` or `Europe/London`, at most 80 characters. Confirm it with `TZ=<name> date` and check the output shows that zone's local time (an unknown name silently falls back to UTC, so a non-UTC zone that prints `UTC` is invalid) |
| expiresAt | ISO date-time with an explicit offset (for example `2026-10-12T09:15:00+05:00`), in the future, and no more than 90 days from now |
| weekly-report | needs `weekday` 0 to 6 (Sunday to Saturday), `hour` 0 to 23, `minute` 0 to 59; no `when` |
| review-reminder | daily; needs `hour` and `minute`; no `weekday` or `when` |
| deadline-reminder | needs `when`: ISO date-time with explicit offset, in the future and not after `expiresAt`; no `weekday`, `hour` or `minute` |

Use the user's actual future expiry, never an example value.

## 2. Build the specification

| Output | Value |
| --- | --- |
| cron | weekly-report: `<minute> <hour> * * <weekday>`; review-reminder: `<minute> <hour> * * *`; deadline-reminder: none |
| when | deadline-reminder only: the deadline converted to UTC |
| expiresAt | the expiry converted to UTC |
| scheduled | false until a host scheduler returns a real task ID |
| requiresHostScheduler | true |

Use one of these prompts, filling in the project and the UTC expiry:

- **weekly-report:** "Use the Humanizer PRO skill's local report procedure for project <project>. Summarize only explicitly saved metadata receipts. If there are no sessions in the period, stay quiet. Never rewrite, analyze, check account balance, send messages or process new text. Respect expiry <expiry>; stop/delete this routine at expiry."
- **review-reminder:** "Remind me about my unfinished writing review for project <project>. Use only approved local context; do not inspect arbitrary files or chat history. Never rewrite, analyze, check account balance or send external messages. Respect expiry <expiry>; stop/delete this routine at expiry."
- **deadline-reminder:** "Remind me about my writing deadline for project <project>. Use only approved local context; do not inspect arbitrary files or chat history. Never rewrite, analyze, check account balance or send external messages. Respect expiry <expiry>; stop/delete this routine at expiry."

Show the specification and prompt, and create nothing until the user approves the timing and scope.

## 3. Schedule with a real host scheduler

Reminders or local reports only: never rewrite, analyze, query balance, send external messages, read arbitrary files or export authentication. Weekly reports stay quiet when no approved receipts exist. Do not infer unpublished drafts or an unfinished session from metadata alone.

Prefer an available documented local Desktop scheduler. Verify that the execution environment can read the private writing store before creation. Cloud jobs cannot read local files or the host's connector sign-in. Do not install a daemon or create another credential store.

If using documented Claude Code session scheduling, explain its session/runtime requirements and lifetime. Current session tools are `CronCreate`, `CronList` and `CronDelete`; verify they are actually available in this host before use. Read back a created task with `CronList`, and use its actual ID for deletion. Recurring session tasks currently expire after seven days and fire only while the session is running and idle; use the earlier of that lifetime and the user's expiry. Recurring fires may be delayed by scheduler jitter. The cron expression is not timezone-aware on its own: verify it matches the host's interpreted local timezone and convert the hour if they differ. Use a host supporting an exact UTC one-off time for deadlines. Check current scheduler documentation for restart behavior and expiry rather than promising persistence.

Read back the actual task identifier, timing/timezone, scope, environment and expiry. If native expiry is unavailable, explain that the prompt's expiry check prevents work but may not delete the timer, and provide pause/delete controls. Do not promise quiet-hours enforcement or automatic deletion unless the host confirms it. Creation failure means not scheduled; do not invent an ID or silently choose another scheduler. Pause/delete through the same host when requested.

Reference: https://code.claude.com/docs/en/scheduled-tasks
