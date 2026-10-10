# Humanizer PRO review evidence — 0.3.1

This is evidence for a human reviewer, not a statement of approval or a request to ignore the scanner.

## Image reference findings

The four reported paths in 0.3.0 referenced the same real branding image in the source's npm file list and native manifests. The standalone 0.3.1 CLI package no longer contains images or provider manifests because they are not CLI runtime dependencies. The native Claude/OpenAI source manifests still retain required branding. The image is never an executable, command, font or runtime script.

Listing icon SHA-256: 872e005eb7c9dd1afd1e06df1b5e83977f8bed5e99f29fa793bbb1193481808d.

Readable CLI runtime files are `humanizer-pro.mjs`, `client.mjs`, `writing.mjs` and `local-input.mjs`. No install hooks, commands, hooks, MCP server declaration, daemon or image execution path is introduced. The source repository remains one canonical skill corpus. Existing repository scan warnings may remain until the reviewer confirms the real image; reducing npm contents alone does not prove the portal hold cleared.

## Own-service OAuth credential findings

README.md and PRIVACY.md deliberately disclose the connection store. `client.mjs` reads only this CLI's Humanizer PRO OAuth connection, created after browser authorization with PKCE and operation scopes. It does not read Anthropic, OpenAI, GitHub, browser cookies or other installers' credentials. Fixed authorized request origin: `https://texthumanizer.pro`; authenticated HTTP redirects are refused. Original scopes: humanize, scan, balance. Owner-only file/directory protection is plaintext, not encryption. Paths may be explicitly configured; credential values are not read from environment variables.

The Claude manifest declares no MCP server or credential environment forwarding. Local writing commands and `doctor` return before connection access. Local review's file input is only an explicitly chosen private review JSON; unexpected credential-shaped input is rejected without echoing values. `userConfig` is not substituted for the browser connection: prompting users to extract refresh tokens would degrade authentication and compatibility. These own-vendor credentials and truthful disclosures remain for reviewer confirmation as the portal permits.

## Listing metadata warnings

Official Claude manifest documentation recognizes icon, documentationUrl, supportUrl, privacyPolicyUrl and termsOfServiceUrl as directory listing fields. Claude Code ignores them at runtime; the directory uses them. The correct real URLs and image are retained. The portal may use an older validator; do not erase support/privacy information to suppress a warning.

Primary documentation: https://code.claude.com/docs/en/plugins-reference#directory-listing-fields

## Release and behavior boundaries

Local tests and manifest validation are independent of portal review. The plugin preserves the explicitly selected writing workflow, readable bundled CLI and optional exact standalone command. Local comparisons need no sign-in. Charged processing still requires effects disclosure, the explicit request and `--consent`; no automatic retry, batch splitting or additional paid smoke call. No guarantee of factual accuracy, detector outcome or directory approval is made.
