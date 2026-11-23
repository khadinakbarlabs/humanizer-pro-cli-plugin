# Security reporting

Report suspected vulnerabilities privately to hello@khadinakbar.com with the subject "Humanizer PRO plugin security". Include the affected version, expected behavior, impact, and safe reproduction steps. Never include passwords, access tokens, private customer text or payment data. We investigate reports and coordinate corrections with the reporter.

The directory edition contains only Markdown instructions, a manifest, a license and an icon. It has no scripts, hooks, dependency installation, background jobs or purchase operations. It declares one remote connector, `https://texthumanizer.pro/mcp`, whose OAuth 2.0 PKCE sign-in and token storage are handled by the Claude host. Do not weaken browser or host controls to connect, and disconnect the connector on shared computers.

The optional local writing store holds approved structured preferences and text-free receipts as plaintext with owner-only permissions. Claude is instructed to refuse symlinked, broadly readable or malformed store files, never to overwrite a file it cannot validate, and to respect an existing lock. Any HTML page Claude writes on request must escape all inserted text, include a restrictive content security policy and load no scripts or external assets. Review is heuristic, not a legal or factual safety check. Reminder setup is opt-in and cannot authorize background text processing.
