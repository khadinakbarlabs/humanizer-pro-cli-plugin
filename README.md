# Humanizer PRO

Humanizer PRO is a skills-only writing plugin backed by a bundled command-line client. Ask it to revise a passage you supply, analyze uncertain writing-style signals, or check your existing Humanizer PRO word allowance. Browser sign-in connects the CLI to your account. The plugin offers general, scholarly and marketing revision modes, and returns the actual service wording with usage information and a reminder to review facts and meaning.

## Requirements and setup

Use this release in **Claude Code with a local macOS or Linux terminal**, Node.js 20.11 or newer, and a browser on that same computer. A Humanizer PRO account and sufficient existing allowance are required for rewriting. The plugin itself does not sell or grant words, purchase a subscription, or change automatic recharge. Installing the skill in a remote chat or Cowork sandbox does not give that environment access to a connection saved on your own computer; those environments are not claimed as supported by this release. Windows has not been validated.

After installation, ask **“Connect Humanizer PRO.”** The skill runs the bundled CLI's `login` command and gives you a Humanizer PRO URL. Open it in your browser and approve the displayed permissions. Authentication uses OAuth 2.0 with PKCE and a callback bound only to `127.0.0.1:6274`. Sign in on the hosted page; never put passwords or tokens in chat. The terminal prints a connection confirmation after the exchange succeeds. Browser controls or sandbox restrictions must not be bypassed.

For a local source checkout, launch Claude Code with `claude --plugin-dir /absolute/path/to/humanizer-pro-cli-plugin`, then use `/humanizer-pro:humanize-text`. No global package installation is needed. Run `node --test tests/cli.test.mjs` from the repository to check the CLI's consent, response validation, callback, storage and failure handling. The test suite uses isolated temporary stores and simulated service responses; it does not spend account words.

## Three examples

- “Use Humanizer PRO in academic mode to revise this passage: Our community library offers a quiet place to read. Staff help visitors find books.”
- “Use Humanizer PRO to analyze writing-style signals in this passage: Our team meets on Monday to review the agenda and discuss the next project.”
- “Check my remaining Humanizer PRO words.”

Rewriting processes only the passage supplied for that operation and returns `humanizedText` verbatim, word consumption, remaining allowance when returned, and factual-review advice. Analysis is available only on explicit request and its uncertain scores are not proof of authorship or misconduct. Translation, original content generation, summarization, detector evasion, purchasing and academic judgments are outside the plugin's capabilities. Results may change facts or meaning and should be reviewed before use.

## What runs and what is sent

The skill invokes the two readable JavaScript files bundled under its `scripts/` directory. There are no install scripts, automatic startup hooks, telemetry, third-party package downloads, or bundled MCP servers. The CLI requires explicit `--consent` for rewrite and analysis and receives only the supplied passage through stdin. It never reads source files, uploaded documents, chat history, Claude memory, or another app's credentials. Source text is data and is never evaluated as code.

The CLI connects only to **https://texthumanizer.pro** for client registration, authorization, token exchange and operations. It uses the service's existing OAuth and Streamable HTTP API internally, without registering a connector in Claude. Selected rewrite text goes through Humanizer PRO to **Rephrasy**, consumes existing account words, and saves input and output in private service history. Requested analysis goes through Humanizer PRO to **ZeroGPT** without deducting words or saving a history entry. The linked service privacy policy covers provider handling and retention. Do not supply sensitive personal data, credentials, payment-card data, government identifiers or protected health information.

## Local storage and recovery

The CLI saves only its own OAuth connection tokens in `~/.humanizer-pro-cli/connection.json`, outside the plugin. The directory uses 0700 permissions and the file 0600 on the supported local filesystem. Tokens are protected by filesystem permissions and are not encrypted. `status` reports connection state without secrets. `logout` deletes this machine's saved connection and does not claim to revoke other remote sessions. No account identity scopes are requested; account sign-in stays on the service's hosted page.

Commands are serialized with a private lock and never automatically repeat a charged operation. Input is limited to 12,000 characters. On a timeout, a rewrite outcome may be unknown; inspect service history or request an allowance check before deciding to retry. If port 6274 is occupied, stop the other local sign-in process first. If a callback page is blocked but the terminal reports a completed connection, follow the terminal confirmation; otherwise seek a permitted setup through support. Do not disable browser security.

## Support and policies

- [Documentation and troubleshooting](skills/humanize-text/references/cli-workflow.md)
- [Humanizer PRO support](https://texthumanizer.pro/mcp-docs#support), hello@khadinakbar.com
- [Service privacy policy](https://texthumanizer.pro/privacy)
- [Plugin privacy details and processor policies](PRIVACY.md)
- [Service terms](https://texthumanizer.pro/terms)
- [Report a security vulnerability](SECURITY.md)

The plugin source is MIT licensed. Humanizer PRO is operated by Khadin Akbar. This plugin is independent of Anthropic; directory submission or inclusion does not imply endorsement.
