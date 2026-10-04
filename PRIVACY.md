# Humanizer PRO plugin privacy

Updated October 5, 2026. Operator and contact: Khadin Akbar, hello@khadinakbar.com.

This notice supplements the [Humanizer PRO service privacy policy](https://texthumanizer.pro/privacy) for the local CLI plugin. Only use text you are authorized to process. Do not submit sensitive personal data or secrets.

## Selected text and service processing

The plugin processes only the passage explicitly supplied for the current request. It does not search agent conversation history, memory, summaries, arbitrary user files or uploaded documents. Approved structured writing profiles and text-free receipts may be read through its separate local writing commands. The CLI accepts passages through standard input, holds them in process memory, and does not save local text history. Your agent host may retain the conversation and displayed tool output according to your account settings and its policies, including Anthropic's policies for Claude and OpenAI's policies for Codex.

CLI requests go only to https://texthumanizer.pro. Rewrites forward the selected passage to Rephrasy, deduct existing account words, and save source and output in private Humanizer PRO history. Requested analysis forwards the selected passage to ZeroGPT; Humanizer PRO does not create a text history entry or deduct words for that operation. Checking allowance retrieves account plan and available words. Account authentication, usage records, infrastructure logs, support information and service history follow the service privacy policy. Hosted account storage and authentication use Supabase.

Humanizer PRO history is retained until you delete the entry or account; account information is retained while the account is active, subject to the service policy's legal retention provisions. Provider processing and retention are governed by their policies and applicable agreements; this plugin does not promise zero retention by third parties. Read the applicable policies:

- [Rephrasy privacy](https://www.rephrasy.ai/privacy-policy)
- [ZeroGPT privacy](https://www.zerogpt.com/privacy-policy)
- [Supabase privacy](https://supabase.com/privacy)
- [Google sign-in privacy](https://policies.google.com/privacy), if you choose Google sign-in

The CLI does not contact advertising services, run background collection, read payment details or make purchases. Optional website features and billing have their own disclosures in the service policy.

## Local authentication storage

Browser sign-in requests only selected operation scopes (humanize, scan, balance). The CLI stores its own access token, refresh token, public client identifier, scope and expiry in `~/.humanizer-pro-cli/connection.json`, or the private configuration directory you explicitly set. It uses 0700 directory and 0600 file permissions on supported systems. This file is not encrypted. The tokens are sent to Humanizer PRO only to authorize the requested operations and refresh the same connection. They are never included in plugin source, diagnostic status or chat by the CLI.

Local connection data remains until `logout` or manual deletion. `logout` deletes this machine's saved connection; it does not revoke other remote sessions or remove account history. Manage remote connections and request account-data deletion through Humanizer PRO settings or hello@khadinakbar.com. No connection from another application or account is imported.

## Optional local writing data

With explicit approval, the plugin stores structured global/project preferences (purpose, audience, tone, spelling, supported mode/style, protected terms, phrases to avoid and the receipt-tracking choice) in `~/.humanizer-pro-writing/writing.json`. Never save private passages, credentials or voice samples in these fields. This separate plaintext store uses owner-only directory/file permissions and contains no authentication tokens. `HUMANIZER_PRO_WRITING_DIR` changes only its local directory.

Optional receipts contain a random identifier, project label, timestamp, operation/status, supplied word usage and review-flag count. Optional feedback contains an accepted/edited/rejected outcome and a predefined reason; it has no free-text field and cannot silently change a profile. These records are not uploaded or used for central analytics. There are at most 50 profiles and 500 receipts across projects. Older receipts are removed when the cap is exceeded. Other records remain until the user resets them or deletes the local store.

`profile show|export|reset` controls preferences. `history show|export|reset` controls receipts. Exports exclude passages and authentication. Reset requires explicit consent and affects only the selected local scope, not service history, other hosts or the OAuth connection. HTML reports are generated from metadata only and load no scripts or external assets. Local review holds the two supplied passages in process memory; saving its optional HTML comparison explicitly creates a file containing those passages. The host may retain command input/output and conversation data under its own policies.

Reminder specifications create no timer or account activity. If the user approves a supported local host schedule, its prompt includes only the project label, timing and constrained report/reminder instructions. Host scheduling has its own persistence, lifetime and deletion controls. No tokens are copied to cloud jobs and no paid text operation runs in the background.
