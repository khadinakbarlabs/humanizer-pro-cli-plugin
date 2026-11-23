# Local writing workspace (directory edition 0.3.2)

Everything here is local. It makes no connector call and consumes no Humanizer words. You (Claude) carry out each procedure with the Read, Write and Edit tools and a few one-line shell commands. There is no helper program.

## The store

Path: `~/.humanizer-pro-writing/writing.json`. If the user names a different dedicated private directory, use that directory instead for the whole conversation. This is the same file and format the full (CLI) edition uses, so both editions can share it. Keep it valid exactly as specified below, or the full edition will refuse to read it.

### Format

The file is one JSON object with exactly these four keys:

| Key | Value |
| --- | --- |
| `version` | the number `1` |
| `profiles` | object; keys are scope names, values are profile objects. At most 50 keys |
| `sessions` | array of receipt objects, oldest first. At most 500 entries |
| `pruned` | non-negative integer: how many receipts were dropped by the 500 cap |

An empty store is `{"version":1,"profiles":{},"sessions":[],"pruned":0}`.

**Scope names** (`global` or a project): lowercase letter first, then lowercase letters, digits or hyphens, at most 64 characters in total. Examples: `global`, `newsletter`, `q3-launch`.

**Profile fields.** Only these keys, each optional:

| Field | Allowed value |
| --- | --- |
| `purpose`, `audience`, `tone` | non-blank text, at most 160 characters, no control characters or line breaks |
| `spelling` | `US`, `UK`, `AU` or `keep-original` |
| `mode` | `stealth`, `academic` or `seo` |
| `style` | `creative`, `journalistic` or `professional` |
| `protectedTerms`, `avoidPhrases` | array of at most 20 strings, each non-blank, at most 120 characters, no control characters |
| `saveSessionReceipts` | `true` or `false` |

**Receipt fields.** Only these keys:

| Field | Rule |
| --- | --- |
| `id` | lowercase UUID, unique in the array |
| `receiptKey` | identical to `id` |
| `project` | a scope name |
| `createdAt` | UTC time in the exact form `YYYY-MM-DDTHH:MM:SS.sssZ` (three-digit milliseconds, letter Z) |
| `operation` | `rewrite`, `review` or `kept-original` |
| `status` | `completed`, `failed` or `unknown` |
| `wordCount` | a non-negative integer only when operation is `rewrite` and status is `completed` (or `null` if the service did not report it); `null` in every other case |
| `mode` | optional; `stealth`, `academic` or `seo`. Leave the key out when unknown |
| `reviewFlagCount` | `null` or an integer 0 to 100 (the number of flag categories from the review checklist) |
| `feedback` | optional object `{"outcome": ..., "reason": ...}`; allowed only on a completed rewrite |
| `feedbackAt` | present exactly when `feedback` is present; same timestamp form as `createdAt` |

Feedback outcomes: `accepted`, `edited`, `rejected`. Reasons: `none`, `too-formal`, `too-casual`, `meaning-changed`, `too-generic`, `voice-mismatch`, `other`.

Never put passages, drafts, voice samples, free-text notes, credentials or any other key into the store. The whole file must stay under 500,000 bytes.

### Generating identifiers and times

- Receipt key: run `uuidgen | tr 'A-Z' 'a-z'` and use the output.
- Timestamp: run `date -u +%Y-%m-%dT%H:%M:%S.000Z` and use the output.

Never invent a UUID or timestamp by hand.

### Reading safely

1. Run `ls -ld ~/.humanizer-pro-writing ~/.humanizer-pro-writing/writing.json`. If the file does not exist, treat the store as empty and create nothing. If either path is a symbolic link (`l` first in the mode), is not owned by the user, or has any group/other permission bits (the directory must read `drwx------`, the file `-rw-------`), stop. Tell the user the store is not private and suggest `chmod 700 ~/.humanizer-pro-writing` and `chmod 600 ~/.humanizer-pro-writing/writing.json` before continuing.
2. Read the file with the Read tool. If it is not valid JSON, or breaks any rule above, stop and say so. **Never overwrite a store you could not read and validate**; the user may need the data.

### Writing safely

Every write needs the user's explicit consent for that specific change. Show the proposed fields first. Then:

1. If `~/.humanizer-pro-writing/writing.lock` exists, another writer (for example the full edition's CLI) is active. Stop and ask the user to retry later. Never delete that lock.
2. Run `mkdir -p ~/.humanizer-pro-writing && chmod 700 ~/.humanizer-pro-writing`.
3. Read and validate the current store (above), apply the change in your working copy, and check the whole result against every rule above, including the caps.
4. Write the **whole** new JSON to `~/.humanizer-pro-writing/writing.json.new` with the Write tool. Never make a partial in-place edit of `writing.json`.
5. Run `chmod 600 ~/.humanizer-pro-writing/writing.json.new && mv ~/.humanizer-pro-writing/writing.json.new ~/.humanizer-pro-writing/writing.json`.
6. Read the file back once and confirm it parses. Report what was saved.

If a write fails, the service result the user already has stays valid. Never repeat a rewrite because a local save failed.

## Profiles

| Action | Procedure |
| --- | --- |
| show / export | Read the store; return only `profiles[scope]` (or `{}`), with the note: "Approved local preferences only. Export excludes authentication and draft text. Saving replaces this scope; current requests override saved defaults." Default scope is `global`, never every project |
| set | Show the scope's current fields first. The new profile **replaces** the whole scope, so carry over still-wanted fields. Validate every field, get consent, write |
| reset | With consent, remove only that scope's key from `profiles`. Receipts are untouched |

Example of approved preferences: `{"audience":"Existing customers","tone":"Warm and direct","protectedTerms":["Humanizer PRO"],"saveSessionReceipts":true}`

## Brief

A brief merges preferences for a planned revision. Load saved profiles only with permission to use saved context; otherwise use the current request alone.

Precedence: current request over project profile over global profile. A later layer's value replaces an earlier one (arrays are replaced, not merged). Produce, in Markdown or JSON:

| Output | Content |
| --- | --- |
| `preferences` | the merged fields |
| `sources` | for each field, which layer it came from: `global`, `project` or `request` |
| `overrideNotes` | one line per replaced field with a different value, in the form "tone: request replaces project." |
| `supportedRewriteOptions` | `{"mode": <merged mode, or stealth>}` plus `style` only if a style is set and mode is `stealth`. If a style is set with another mode, add the override note "style is not supported in <mode> mode; it will guide review only." |
| `receiptKey` | a fresh UUID from `uuidgen` (lowercase) |
| `limitation` | "Only supported mode/style options can reach the current rewriting service. Other approved preferences guide the assistant editing plan and review; personalized voice adherence is not guaranteed." |
| `processingAuthorized` | `false`. A brief never authorizes a rewrite |

## Review checklist

Review needs only the two passages the user supplied in the conversation (or a file the user explicitly names, read with the Read tool) plus approved protected terms. Never search for input files. Each passage must be non-blank and at most 12,000 characters. Nothing is saved and no service is called.

Work through every category. For each one, list the items found in the original and in the revision, then report items **removed or changed** (in the original but not the revision) and **added** (in the revision but not the original). Compare items as exact text; list each distinct item once.

| Category | What counts as one item |
| --- | --- |
| Numbers | A run of digits, optionally with a leading + or -, internal `.` or `,` separators and a trailing `%`, not glued to a preceding letter or digit. "$50" yields `50`; "3.5%" yields `3.5%` |
| Dates | ISO dates `YYYY-MM-DD`, and an English month name in full followed by a day and optional year ("October 5", "October 5, 2026"), matched case-insensitively |
| Links | Text starting `http://` or `https://` up to whitespace or a quote/angle bracket, with trailing `)`, `,`, `.`, `;`, `!`, `?` removed |
| Quotations | A single-line span in straight double quotes, curly double quotes or curly single quotes, including the quote marks |
| Negations | Each occurrence of: not, no, never, without, neither, cannot, can't, isn't, won't, don't, doesn't, didn't (whole words, case-insensitive). Flag when the counts of each word differ; report the full lists from both texts |
| Protected terms | Each approved term that appears exactly (case-sensitive) in the original but not in the revision |

Present a Markdown table with one row per flagged category (category, removed or changed, added), then this notice verbatim: "These exact-detail checks are not proof of factual accuracy or preserved meaning. Review context, names, dates, quantities, qualifiers and claims; additional changes may be missed." State whether the texts are identical. Label any further semantic observations as your own suggestions with quoted evidence. `reviewFlagCount` for a receipt is the number of flagged categories.

Worked example. Original: "Acme will not charge $50 on 2026-10-05." Revised: "Acme charges $60 on 2026-10-06." Protected term: "will not charge". Flags: numbers (original has `50`, `2026`, `10`, `05`; revision has `60`, `2026`, `10`, `06`; so removed `50`, `05` and added `60`, `06`), dates (removed `2026-10-05`, added `2026-10-06`), negations (original `not`, revision none), protected terms (removed `will not charge`). Four categories.

If the user asks for a browser page, write it yourself following the HTML rules in [processing/results](editing-and-results.md). Saving it stores both passages in that file, so ask before saving.

## Receipts (session)

Save a receipt only with consent for this session, or when the scope's approved profile has `saveSessionReceipts: true`. Use the brief's actual receipt key (or a fresh UUID) and the real service values.

1. If a receipt with that `id` already exists: if its project and every field match, report "already recorded" and write nothing; if anything differs, stop and report a conflict.
2. Otherwise append `{id, receiptKey (same value), project, createdAt, operation, status, wordCount, mode (if known), reviewFlagCount}`.
3. If there are now more than 500 receipts, remove the oldest from the front of the array and add 1 to `pruned` for each one removed.
4. Write as above.

## Feedback

Requires a recorded receipt in that project with operation `rewrite` and status `completed`, identified by its UUID. Set `feedback` to `{"outcome": ..., "reason": ...}` (reason defaults to `none`) and `feedbackAt` to the current timestamp, replacing any earlier feedback so it is never double-counted. Feedback never changes a profile. Without a matching receipt, keep the feedback in the conversation only.

## History

- show / export: list `sessions` whose `project` equals the chosen scope, with the note "Local metadata only. No draft text or authentication included."
- reset (with consent): remove that scope's receipts only. It does not touch profiles, service history or the connector sign-in.

## Report

Period: 1 to 90 days (default 7), ending now; scope default `global`, never all projects. Include receipts of that project whose `createdAt` falls in the period. Report every field below; do not add others.

| Field | Definition |
| --- | --- |
| recordedSessions | receipts in the period |
| completedRewrites | operation `rewrite`, status `completed` |
| keptOriginal | operation `kept-original`, status `completed` |
| localReviews | operation `review`, status `completed` |
| failed / unknown | receipts with status `failed` / `unknown` |
| wordsReportedUsed | sum of `wordCount` over completed rewrites (nulls count as 0) |
| rewritesWithUnknownUsage | completed rewrites with `wordCount` null |
| rated | completed rewrites that have feedback |
| accepted / edited / rejected | rated receipts by outcome |
| awaitingFeedback | completedRewrites minus rated |
| acceptanceRate | accepted divided by rated; "not available" when rated is 0. Unrated rewrites never count as accepted |
| activeDays and timeline | receipts per calendar day, using the UTC date (first 10 characters of `createdAt`) |
| feedbackReasons | count of each reason other than `none` among rated receipts |
| retainedReceipts / prunedReceipts | total receipts in the store (all projects) / the `pruned` value |

End with: "Local, explicitly saved receipts only; not a complete account audit. Word usage is reported from supplied service results; host costs and time saved are not measured. Active-day buckets use UTC. No writing passages are stored in this report." and, when `pruned` is above 0, "N older receipts were removed by the 500-receipt retention cap." Never report time saved, account balance, host costs, installs or central retention. A report never authorizes retries or new processing.

## Routine

See [host routines](host-routines.md) for the reminder rules.
