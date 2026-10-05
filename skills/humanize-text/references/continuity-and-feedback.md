# Approved continuity, feedback and reminders

## Approved continuity and feedback

Use [writing workspace](writing-workspace.md) for exact JSON contracts. Local commands make no account call and consume no Humanizer words. Saving preferences is optional: explain the separate private plaintext writing store, show the proposed fields and obtain approval before `profile set --consent`. It replaces the selected scope; show its current fields first and preserve still-wanted ones. Global/project preferences are separate and current instructions override them. Show/export/reset provides control. Do not save voice samples, passages, raw transcripts, arbitrary notes or credentials. Do not claim local deletion affects service history or OAuth.

Receipts need separate current-session approval or an approved profile choice `saveSessionReceipts: true`. Record only permitted metadata with `session --consent`, using the brief's actual unique receipt key and returned usage (null when missing or the outcome is unknown). Identical keys/metadata are idempotent. A failed metadata save must not hide a successful service result or cause a new rewrite. A receipt or profile never authorizes processing another passage. Records are capped at 500 across projects; disclose missing/pruned coverage.

Feedback may be accepted, edited or rejected with a supported reason. Persist it only for the user's selected recorded completed rewrite, with `feedback --consent`; otherwise keep the feedback in the current conversation. Feedback never silently changes a profile. Suggest a precise preference and obtain approval before saving it; one complaint is not a permanent global rule. There is no feedback upload endpoint or telemetry.

Reports cover only explicitly recorded local metadata for the chosen scope and period. Explain unrated results, unknown usage/outcomes and missing coverage. Do not invent time saved, central retention/installs, account balance or host costs. `history show|export|reset` controls receipts separately from preferences. HTML is escaped, self-contained and has no external assets or scripts; save/open it at the user's request through a local artifact mechanism.

## Opt-in host reminders

Read [host routines](host-routines.md) when the user asks for a schedule. The local `routine` command prepares a validated specification; it does not create a timer. Supported purposes are weekly reports, review reminders and one-off deadlines, never background rewriting. Confirm timing, timezone, expiry, notification preference and scope, then use an actually available documented local host scheduler. Verify its actual task ID, timing, environment, scope, lifetime and pause/delete path. If unavailable, return the plan and explicitly say it is not scheduled. CLI success is not timer-execution proof.

Stay quiet for weekly reports without receipts. Respect host lifetime limits and expiry. Do not generate repeated sessions solely for engagement. A cloud job cannot inherit local files/tokens; never export credentials, install a daemon or use a hidden fallback. Pause/delete through the same host when requested.
