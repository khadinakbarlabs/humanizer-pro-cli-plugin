# Humanizer PRO (directory edition)

Humanizer PRO connects Claude to your existing Humanizer PRO account. Supply a passage, choose general, academic or marketing revision, and receive the revised text with word usage and a reminder to check facts and meaning. The plugin also helps you plan revisions, keep approved writing preferences, check a revision for changed details, record optional feedback, see private writing reports and plan reminders. Writing-style analysis and allowance checks run only when you ask.

## Directory edition

This folder is the **text-only build for the Claude plugin directory**. It contains only instructions (Markdown), a manifest and an icon: no scripts, no programs, no HTML. Account operations go through the vendor-hosted Humanizer PRO connector at `https://texthumanizer.pro/mcp`, which the plugin declares and the host signs in to. Local features (preferences, review, receipts, reports, reminders) are carried out by Claude following written procedures.

**What works the same**

- Rewrite (`stealth`, `academic`, `seo`, with optional style in stealth), analysis and allowance check against your Humanizer PRO account.
- Disclosure before each call, one passage at a time, the 12,000-character limit, no silent splitting, no automatic retries and no purchases.
- Verbatim results presented as **Revised text**, **Check before using**, **Usage**; the detection-uncertainty notice on every analysis.
- The private writing store at `~/.humanizer-pro-writing/writing.json`, in the same format as the full edition, so both editions can share it. Profiles, briefs, receipts, feedback, history and reports keep the same fields, caps and definitions.
- Reminder specifications with the same kinds, limits, prompts and scheduler rules.

**What is less exact**

- **Guards are instructions, not code.** The full edition's client refuses oversized text, missing consent, invalid modes, style outside stealth and malformed results before anything is sent. Here Claude follows those rules; the service still validates its inputs, but nothing on your computer enforces them.
- **Review is a careful read, not a deterministic diff.** Claude compares numbers, dates, links, quotations, negations and protected terms by reading both passages. It is usually close but can miss a changed digit in a long passage, and results can vary between runs.
- **The writing store has weaker integrity protection.** There is no exclusive lock (Claude only respects an existing lock), no guaranteed atomic write, and validation and the 500-receipt cap depend on Claude editing the JSON correctly. Private permissions (folder 700, file 600) depend on Claude running `chmod`. A bad edit could still corrupt saved preferences; Claude is told never to overwrite a file it could not validate.
- **HTML pages are written on request**, not rendered by a built-in template, so layout varies. Escaping follows written rules rather than tested code.
- **Higher token cost.** Each save reads and rewrites the whole store, and the review checklist costs more than one helper call.
- **Sign-in moves to the host.** OAuth runs through the host's connector controls (`/mcp` in Claude Code) and tokens are held by the host, not in `~/.humanizer-pro-cli`. A full-edition CLI connection does not carry over. There are no exact `doctor`, `status` or `logout` commands; use the host's connector status and disconnect controls.
- **Per-operation permissions are coarser.** The CLI could sign in with only one scope (for example balance only). The host connector usually requests all three operation scopes (humanize, scan, balance) at once.
- **The connector's own tool descriptions reach Claude.** The skill tells Claude its rules win (for example, no automatic allowance check before every workflow).
- **Connector sign-in must be verified in your host.** It has been designed against the service's published OAuth metadata, not yet confirmed end to end in every Claude host.

The **full edition**, with the readable Node.js CLI and its deterministic helpers, stays in the repository root and is installable from GitHub:

```text
/plugin marketplace add khadinakbarlabs/humanizer-pro-cli-plugin
/plugin install humanizer-pro@humanizer-pro
```

Both editions use the plugin name `humanizer-pro`; install one or the other, not both.

## Quick start

1. Install the plugin from the Claude directory and start a new session.
2. For a local comparison, ask **"Use Humanizer PRO to compare these two passages"** and supply both. No account is needed.
3. For account work, ask **"Connect Humanizer PRO."** In Claude Code, run `/mcp`, choose `humanizer-pro` and authenticate; in other Claude apps, connect it from connector settings. Sign in on Humanizer PRO's hosted page and approve the permissions.
4. Try: "Use Humanizer PRO in academic mode to revise this passage: Our community library offers a quiet place to read. Staff help visitors find books."

Claude explains the processing and word usage before sending your passage. You can also invoke `/humanizer-pro:humanize-text` directly. A Humanizer PRO account with existing allowance is required for rewriting; the plugin does not sell or grant words.

## Examples

- "Use Humanizer PRO in academic mode to revise this passage: ..."
- "Use Humanizer PRO to analyze writing-style signals in this passage: ..."
- "Check my remaining Humanizer PRO words."
- "Remember this project's approved tone: clear and conversational. Show me what you will save first."
- "Compare this original and revision. Flag changed numbers, dates, links, quotations and protected terms."
- "Show my seven-day writing report."
- "Set up a weekly writing report reminder, if this host supports scheduling."

Translation, original content generation, summarization, detector evasion, purchasing and academic judgments are out of scope. Results may change facts or meaning and should be reviewed before use. Analysis scores are uncertain and are not proof of authorship or misconduct.

## What is sent where

Only the passage you select for an operation is sent, to `https://texthumanizer.pro`. Rewriting forwards it to **Rephrasy**, consumes existing account words and saves input and output in private service history. Analysis forwards it to **ZeroGPT** without deducting words or saving history. Never supply credentials, payment-card data, government identifiers, protected health information or other sensitive personal data.

Local preferences and receipts are saved only with your approval in `~/.humanizer-pro-writing/writing.json` (private plaintext, at most 50 profiles and the newest 500 text-free receipts). No passages, voice samples, free-text notes or tokens are saved there.

## Support and policies

- [Connection and troubleshooting](skills/humanize-text/references/connection.md)
- [Humanizer PRO support](https://texthumanizer.pro/mcp-docs#support), hello@khadinakbar.com
- [Service privacy policy](https://texthumanizer.pro/privacy) and [plugin privacy details](PRIVACY.md)
- [Service terms](https://texthumanizer.pro/terms) and [plugin terms](TERMS.md)
- [Report a security vulnerability](SECURITY.md)

The plugin is MIT licensed. Humanizer PRO is operated by Khadin Akbar. This plugin is independent of Anthropic; directory submission or inclusion does not imply endorsement.
