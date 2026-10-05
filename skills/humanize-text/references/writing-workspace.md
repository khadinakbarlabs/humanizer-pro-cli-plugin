# Local writing workspace — 0.3.1

These commands are local, make no account calls and consume no Humanizer words. Supply JSON through stdin; never interpolate it into a shell command. Use the quoted bundled CLI or verified exact standalone version. Output is JSON unless HTML is requested.

Preferences and receipts live in `~/.humanizer-pro-writing/writing.json`, or a dedicated private `HUMANIZER_PRO_WRITING_DIR`; 0700 directory/0600 file, plaintext. Local commands never read OAuth. Read-only commands create no state. Writes require `--consent`, use a private lock/atomic update, and reject unsafe files, corrupt state and concurrent writes. Do not remove an active lock. No file search, other-agent memory, telemetry, voice samples or draft bodies are saved.

## Profiles and brief

`profile show|export [--project newsletter]` shows only that scope. Default scope is `global`, not every project. `profile set --consent [--project newsletter]` takes a complete replacement of approved fields; preserve still-wanted fields. `profile reset --consent [--project newsletter]` deletes only those preferences.

Allowed fields: `purpose`, `audience`, `tone` (nonblank, 160 characters maximum); `spelling` (`US`, `UK`, `AU`, `keep-original`); `mode` (`stealth`, `academic`, `seo`); `style` (`creative`, `journalistic`, `professional`); `protectedTerms`, `avoidPhrases` (20 items maximum, 120 characters each); `saveSessionReceipts` (boolean, separately explained opt-in tracking). No arbitrary fields, passages or credentials.

Example approved preferences:

```json
{"audience":"Existing customers","tone":"Warm and direct","protectedTerms":["Humanizer PRO"],"saveSessionReceipts":true}
```

`brief [--project newsletter]` takes current instructions in the same field shape; `{}` means use approved saved defaults. Request overrides project overrides global. Arrays replace earlier arrays. Output includes preferences, field sources, override notes, supported rewrite options, a unique `receiptKey` and `processingAuthorized:false`. Only the supported mode/style object becomes provider options. Other preferences guide assistant planning/review, not guaranteed personalized service rewriting. Do not load profiles without permission to use saved context.

## Review

`review [--format json|html] [--input selected.json]` takes:

```json
{"original":"Acme will not charge $50 on 2026-10-05.","revised":"Acme charges $60 on 2026-10-06.","protectedTerms":["will not charge"]}
```

Each passage is at most 12,000 characters. Stdin remains supported. Only local review also accepts one explicitly user-selected or approved input JSON file, max 120,000 bytes, regular and owner-only (0600); symlinks and shared files are rejected. Saving this file persists passages: obtain approval naming the file first. Invoke the CLI as one command without shell glue; do not bypass host permission checks or search for input files. Account commands and local mutations reject `--input`. Both are returned exactly, with limited number/date/URL/quotation/negation/protected-term differences. This is not semantic or factual proof. HTML is an escaped, self-contained browser page through stdout; no passage is persisted. Saving a comparison puts its passages in the user-chosen file: obtain a request to save/open it.

## Receipts and feedback

`session --consent [--project newsletter]` takes:

```json
{"receiptKey":"7e9493cb-ded6-4b97-8a6b-5e7bc89336a4","operation":"rewrite","status":"completed","wordCount":20,"mode":"stealth","reviewFlagCount":1}
```

Use the brief's real key, not this example. Operations: `rewrite`, `review`, `kept-original`. Status: `completed`, `failed`, `unknown`. Usage is the actual service count or null; failed/unknown/nonrewrite receipts require null. Mode is optional, supported only; reviewFlagCount is optional/null or the actual count of local flag categories. No passage. Saving requires session approval or approved `saveSessionReceipts:true`. Identical key/metadata reuse returns the existing receipt; conflicting reuse fails. Retention caps receipts at 500 across projects; reports disclose pruning. At most 50 profiles.

`feedback --session ID --project newsletter --consent` takes `{"outcome":"accepted","reason":"none"}`. Outcomes: accepted, edited, rejected. Reasons: none, too-formal, too-casual, meaning-changed, too-generic, voice-mismatch, other. Requires a recorded completed rewrite in that project. Updates replace the prior feedback, avoiding double counting; no profile change or upload.

`history show|export [--project newsletter]` returns that scope's receipts. `history reset --consent [--project newsletter]` deletes only those receipts. It does not delete remote service history, profiles or OAuth. Reset preferences separately.

## Report

`report [--project newsletter] [--days 7] [--format json|html]` covers 1–90 past days from saved timestamps. Default is global scope, not all projects. It reports recorded sessions, completed rewrites, reported words, unknown usage/outcomes, feedback outcomes, awaiting feedback and UTC active-day buckets. Acceptance denominator is explicitly rated completed rewrites; unrated is not accepted. No measured time saved, account balance, host costs, actual installs or central retention.

HTML is stdout. Save/open it locally at the user's request; this is not a host app card. A report never authorizes service retries or new processing. Local write failure must not replace a successful service result with a retry.
