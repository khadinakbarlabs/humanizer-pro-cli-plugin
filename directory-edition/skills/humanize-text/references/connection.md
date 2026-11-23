# Connecting Humanizer PRO

This edition contains no programs. Account operations go through the vendor-hosted Humanizer PRO connector that the plugin declares:

| Name | Transport | URL |
| --- | --- | --- |
| `humanizer-pro` | Streamable HTTP | `https://texthumanizer.pro/mcp` |

The connector uses Humanizer PRO's existing OAuth 2.0 sign-in with PKCE and dynamic client registration. The host (Claude Code, Claude Desktop, claude.ai or Cowork) runs the sign-in and keeps the tokens. The plugin never sees, stores or prints them.

## Connect

When the user asks "Connect Humanizer PRO":

1. Check whether the connector's tools are available. If they are, it is connected; say so. Do not call `check_word_balance` just to prove the connection.
2. If the connector needs authentication, tell the user how to start it in their host:
   - Claude Code: run `/mcp`, choose `humanizer-pro` (listed under the plugin), then choose authenticate.
   - Claude Desktop, claude.ai or Cowork: open the plugin's connector in settings and choose connect.
3. The user signs in on Humanizer PRO's hosted page in their browser and approves the requested permissions. Opening the link is not completion; wait until the host shows the connector as connected.

Never ask for passwords or tokens in chat, never read another application's credentials, never copy tokens, and never bypass browser or host security controls.

## Permissions (scopes)

The service offers three operation scopes: `humanize` (rewrite), `scan` (analysis) and `balance` (allowance). No identity scopes are requested. The host connector requests the scopes the server advertises, so a user usually grants all three at once. If the sign-in page lets the user choose, they may approve only what they need; a tool call outside the granted scopes then fails, and the fix is to reconnect and approve that scope.

## Status, disconnect and diagnostics

| Need | How |
| --- | --- |
| Is it connected? | The host's connector list (`/mcp` in Claude Code, connector settings elsewhere) |
| Disconnect this host | The host's disconnect or clear-authentication control. This removes the host's tokens; it does not revoke other sessions or delete service history |
| Revoke everywhere or delete account data | Humanizer PRO account settings, or hello@khadinakbar.com |

## Troubleshooting

- **Sign-in fails or the callback page errors:** retry the host's authenticate step once. If it keeps failing, contact support; do not disable security controls.
- **Missing permission:** reconnect and approve the scope for that operation.
- **Expired or revoked grant:** reconnect through the host. Never paste a token from another app.
- **Insufficient allowance:** explain the account limit. The plugin has no payment or upgrade action.
- **Failed or timed-out rewrite:** no automatic retry. The outcome may be unknown; check service history or, with approval, the allowance before considering another call.
- **Connector unavailable in this environment:** explain that account operations are unavailable here. Local review, briefs, preferences and reports still work where the host allows file access.

## Where text goes

The connector talks only to `https://texthumanizer.pro`. Rewriting forwards the selected passage to Rephrasy; analysis forwards it to ZeroGPT, as disclosed in the [service privacy policy](https://texthumanizer.pro/privacy). No conversation history or other credentials are sent.

Support: https://texthumanizer.pro/mcp-docs#support. Contact: hello@khadinakbar.com.
