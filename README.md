# Humanizer PRO

Humanizer PRO connects your writing assistant to your existing Humanizer PRO account. Supply a passage, choose general, academic or marketing revision, and receive the revised text with word usage and a reminder to check facts and meaning. A local CLI handles browser sign-in and service requests. Optional writing-style analysis and allowance checks run only when requested.

## Quick start in Claude Code

In Claude Code, add this repository and install the skill:

```text
/plugin marketplace add khadinakbarlabs/humanizer-pro-cli-plugin
/plugin install humanizer-pro@humanizer-pro
```

Start a new session, then ask **“Connect Humanizer PRO.”** Open the sign-in link on the same computer and approve the displayed permissions. Once the terminal confirms connection, try:

> Use Humanizer PRO in academic mode to revise this passage: Our community library offers a quiet place to read. Staff help visitors find books.

The assistant explains the processing and word usage before sending your passage. You receive **Revised text**, **Usage**, and **Review** in the conversation. Select and copy the text normally. You can also invoke `/humanizer-pro:humanize-text` directly.

The plugin includes the readable CLI as a fallback, so installing a separate command is optional. If you want to use Humanizer PRO from your terminal or other agents, install the standalone CLI below. This GitHub installation route is available independently of directory review; it is not a claim of Anthropic approval.

## Requirements and setup

Use this release with a **local macOS or Linux terminal**, Node.js 20.11 or newer, and a browser on that same computer. The skill is packaged for local Codex and Claude Code. A Humanizer PRO account and sufficient existing allowance are required for rewriting. The plugin itself does not sell or grant words, purchase a subscription, or change automatic recharge. Installing the skill in a remote chat or Cowork sandbox does not give that environment access to a connection saved on your own computer; those environments are not claimed as supported by this release. Windows has not been validated.

## Start with the CLI

Download **humanizer-pro-cli-0.2.0.tgz** from the [v0.2.0 release](https://github.com/khadinakbarlabs/humanizer-pro-cli-plugin/releases/tag/v0.2.0). From the folder containing that download:

```sh
npm install --global --ignore-scripts ./humanizer-pro-cli-0.2.0.tgz
humanizer-pro --help
humanizer-pro login
```

The release provides a SHA-256 checksum file for verifying the download. The package is not published on npm. Installation adds the `humanizer-pro` command, with no third-party dependencies or install hooks. If global installation needs elevated privileges, use a user-owned npm prefix or the source command below; do not run it with sudo.

With a source checkout, no npm installation is needed:

```sh
node skills/humanize-text/scripts/humanizer-pro.mjs login
```

After sign-in, check your account or process a passage supplied through stdin:

```sh
humanizer-pro status
humanizer-pro balance
humanizer-pro rewrite --consent --mode academic <<'HUMANIZER_TEXT'
Our community library offers a quiet place to read. Staff help visitors find books.
HUMANIZER_TEXT
```

The quoted delimiter prevents shell expansion of the passage. `--consent` explicitly permits processing: rewriting sends the passage to Humanizer PRO and Rephrasy, consumes existing words, and stores private source/output history. Operation results are JSON for use in scripts or by an agent. Nothing is processed on installation or sign-in.

## Use through your agent

After installation, ask **“Connect Humanizer PRO.”** The skill runs the bundled CLI's `login` command and gives you a Humanizer PRO URL. Open it in your browser and approve the displayed permissions. Authentication uses OAuth 2.0 with PKCE and a callback bound only to `127.0.0.1:6274`. Sign in on the hosted page; never put passwords or tokens in chat. The terminal prints a connection confirmation after the exchange succeeds. Browser controls or sandbox restrictions must not be bypassed.

For a local source checkout, launch Claude Code with `claude --plugin-dir /absolute/path/to/humanizer-pro-cli`, then use `/humanizer-pro:humanize-text`. Codex packaging includes a portable root manifest, a compatibility manifest and skill presentation metadata. The skill can use the standalone command or the same readable client bundled with the plugin. Both use the same local Humanizer PRO connection store.

Run `npm test` from the repository to check consent, response validation, callback, storage and failure handling. The test suite uses isolated temporary stores and simulated service responses; it does not spend account words.

## Three examples

- “Use Humanizer PRO in academic mode to revise this passage: Our community library offers a quiet place to read. Staff help visitors find books.”
- “Use Humanizer PRO to analyze writing-style signals in this passage: Our team meets on Monday to review the agenda and discuss the next project.”
- “Check my remaining Humanizer PRO words.”

Rewriting processes only the passage supplied for that operation and returns `humanizedText` verbatim, word consumption, remaining allowance when returned, and factual-review advice. Analysis is available only on explicit request and its uncertain scores are not proof of authorship or misconduct. Translation, original content generation, summarization, detector evasion, purchasing and academic judgments are outside the plugin's capabilities. Results may change facts or meaning and should be reviewed before use.

## What the user sees

**Humanizer PRO** appears as a skill/plugin choice in the local agent. The user says “Connect Humanizer PRO,” completes browser sign-in, then asks for a passage to be revised. The agent runs the CLI and presents **Revised text**, **Usage**, and **Review** in its normal conversation. The user selects and copies the text as usual. This package does not add an interactive result card or a custom Copy button. See [the walkthrough of the user experience](docs/EXPERIENCE.md).

Use the separate Humanizer PRO connector for the hosted chat workflow. A skill installed in a remote chat does not connect to the CLI on your computer.

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

The plugin source is MIT licensed. Humanizer PRO is operated by Khadin Akbar. This plugin is independent of OpenAI and Anthropic; directory submission or inclusion does not imply endorsement.
