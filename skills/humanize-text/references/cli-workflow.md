# CLI workflow

The CLI is readable Node.js source bundled with the skill, with no package downloads, dependency installation, startup hooks, background jobs, telemetry, or MCP server configuration. It uses Humanizer PRO's existing OAuth 2.0 PKCE sign-in and Streamable HTTP API internally. Users interact through the command line; this package does not register a connector in the host.

The same client is available as the standalone `humanizer-pro` command after local `.tgz` installation. The skill invokes its bundled script directly and needs no global npm installation. Both use the same private connection store. Local information is available with `humanizer-pro --help` and `humanizer-pro --version`; operation results are JSON. This release does not include an interactive view.

Resolve the installed skill directory and invoke `node` with its quoted `scripts/humanizer-pro.mjs` path. These arguments are supported:

| Command | Behavior |
| --- | --- |
| `help`, `version` | Local information; no connection needed |
| `login` | Browser authorization for `humanize scan balance`, no identity scopes |
| `login --scope balance` | Authorizes only allowance checks |
| `status` | Local status and granted scopes; no token output |
| `balance` | Reads connected account allowance |
| `rewrite --consent --mode academic` | Rewrites exactly the supplied stdin passage once |
| `analyze --consent` | Analyzes exactly the supplied stdin passage once |
| `logout` | Removes this machine's saved connection; does not claim remote revocation |

The CLI talks only to `https://texthumanizer.pro` at `/register`, `/authorize`, `/token`, and `/mcp`; the browser sign-in page may use Google's optional authentication. It never sends tokens to another destination and refuses HTTP redirects in authenticated requests. The rewriting service calls Rephrasy and analysis calls ZeroGPT as disclosed in the service privacy policy. No Claude conversation history or other software credentials are accessed.

Tokens are plaintext in an owner-only file (0600) inside an owner-only directory (0700) at `~/.humanizer-pro-cli`. This is filesystem protection, not encryption. `HUMANIZER_PRO_CONFIG_DIR` can point to another dedicated private directory; it is a path setting, never a credential. Do not place this directory inside a repository or plugin. The CLI does not read credential environment variables. Access tokens expire; the CLI refreshes expired connections within the original granted scope before an operation. Commands use a local lock to prevent concurrent refresh or duplicate operations.

## Troubleshooting

- **Sign-in port busy:** stop the other local sign-in process; no remote fallback or browser security bypass.
- **Callback page fails to render:** check the terminal. A completed token exchange prints `Humanizer PRO connected`; otherwise sign-in is incomplete. Do not disable security controls. Ask support for a permitted setup.
- **Missing permission:** reconnect and approve the requested scope. A balance-only connection cannot rewrite or analyze.
- **Locked after a crash:** verify that the CLI process has stopped before removing only its `command.lock` file in the private configuration directory. Never delete another active command's lock.
- **Expired or revoked grant:** reconnect through the browser. Never paste a session token from another app.
- **Insufficient allowance:** explain the account limit. The plugin has no payment or upgrade command.
- **Failed or timed-out rewrite:** no automatic retry. An outcome may be unknown; review service history or request a balance check before considering another call.

Support: https://texthumanizer.pro/mcp-docs#support. Contact: hello@khadinakbar.com.
