# Humanizer PRO plugin privacy

Updated October 3, 2026. Operator and contact: Khadin Akbar, hello@khadinakbar.com.

This notice supplements the [Humanizer PRO service privacy policy](https://texthumanizer.pro/privacy) for the local CLI plugin. Only use text you are authorized to process. Do not submit sensitive personal data or secrets.

## Selected text and service processing

The plugin processes only the passage explicitly supplied for the current request. It does not query Claude conversation history, memory, summaries, user files or uploaded documents. The CLI accepts passages through standard input, holds them in process memory, and does not save local text history. Claude itself may retain the conversation and displayed tool output according to your Claude account settings and Anthropic's policies.

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
