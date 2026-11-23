# Humanizer PRO plugin privacy (directory edition)

Operator and contact: Khadin Akbar, hello@khadinakbar.com.

This notice supplements the [Humanizer PRO service privacy policy](https://texthumanizer.pro/privacy) for the text-only directory edition of the plugin. Only use text you are authorized to process. Do not submit sensitive personal data or secrets.

## Selected text and service processing

The plugin processes only the passage explicitly supplied for the current request. It does not search agent conversation history, memory, summaries, arbitrary user files or uploaded documents. Approved structured writing profiles and text-free receipts may be read from the separate local writing store. Local review uses the two passages you supply, or one file you explicitly name; it never searches files and never sends them to the service. Your agent host may retain the conversation and tool input/output according to your account settings and Anthropic's policies.

The plugin registers one remote connector, `humanizer-pro`, at `https://texthumanizer.pro/mcp`. Requests go only to that service. Rewrites forward the selected passage to Rephrasy, deduct existing account words, and save source and output in private Humanizer PRO history. Requested analysis forwards the selected passage to ZeroGPT; Humanizer PRO does not create a text history entry or deduct words for that operation. Checking allowance retrieves account plan and available words. Account authentication, usage records, infrastructure logs, support information and service history follow the service privacy policy. Hosted account storage and authentication use Supabase.

Humanizer PRO history is retained until you delete the entry or account; account information is retained while the account is active, subject to the service policy's legal retention provisions. Provider processing and retention are governed by their policies and applicable agreements; this plugin does not promise zero retention by third parties:

- [Rephrasy privacy](https://www.rephrasy.ai/privacy-policy)
- [ZeroGPT privacy](https://www.zerogpt.com/privacy-policy)
- [Supabase privacy](https://supabase.com/privacy)
- [Google sign-in privacy](https://policies.google.com/privacy), if you choose Google sign-in

The plugin does not contact advertising services, run background collection, read payment details or make purchases.

## Authentication

Sign-in uses Humanizer PRO's OAuth 2.0 with PKCE, run by your Claude host's connector system. It requests operation scopes (humanize, scan, balance) and no identity scopes. The host stores and refreshes the tokens under its own policies; the plugin contains no credential store and never sees, prints or copies tokens. Disconnect through the host's connector controls. That removes the host's connection; it does not revoke other sessions or remove account history. Manage remote connections and request account-data deletion through Humanizer PRO settings or hello@khadinakbar.com.

## Optional local writing data

With explicit approval, Claude stores structured global/project preferences (purpose, audience, tone, spelling, supported mode/style, protected terms, phrases to avoid and the receipt-tracking choice) in `~/.humanizer-pro-writing/writing.json`. Never save private passages, credentials or voice samples in these fields. This plaintext store is set to owner-only permissions (folder 700, file 600) and contains no authentication tokens.

Optional receipts contain a random identifier, project label, timestamp, operation/status, supplied word usage and review-flag count. Optional feedback contains an accepted/edited/rejected outcome and a predefined reason; it has no free-text field and cannot silently change a profile. These records are not uploaded or used for central analytics. There are at most 50 profiles and 500 receipts across projects; older receipts are removed when the cap is exceeded. Other records remain until you reset them or delete the store.

Show/export/reset controls exist for preferences and for receipts separately. Exports exclude passages and authentication. Reset requires explicit consent and affects only the selected local scope, not service history, other hosts or the connector sign-in. Reports contain metadata only. A comparison page saved at your request contains both passages; you control that file.

Reminder specifications create no timer or account activity. If you approve a supported host schedule, its prompt includes only the project label, timing and constrained report/reminder instructions. Host scheduling has its own persistence, lifetime and deletion controls. No tokens are copied to cloud jobs and no paid text operation runs in the background.
