# Security reporting

Report suspected vulnerabilities privately to hello@khadinakbar.com with the subject “Humanizer PRO plugin security”. Include the affected version, expected behavior, impact, and safe reproduction steps. Never include passwords, access tokens, private customer text or payment data. We investigate reports and coordinate corrections with the reporter.

The supported release uses local macOS or Linux, Node.js 20.11 or newer, and a same-computer browser. OAuth uses PKCE, unpredictable state and a loopback-only callback. Local token files rely on private filesystem permissions and are not encrypted. Do not weaken browser or sandbox controls to connect. Keep your operating system, browser and Node.js maintained, and delete local tokens with `logout` on shared computers.

The plugin has no dependency installation, automatic hooks, token imports, purchase operations or background jobs. Humanizer PRO endpoints and third-party text processors are disclosed in the README and privacy notice.

Version 0.3.0 also has a separate private plaintext writing store for explicitly approved structured preferences and text-free receipts. It rejects symlinked, broadly readable, malformed or oversized store files; writes use an exclusive lock and atomic replacement. Reset/export commands do not access OAuth tokens. HTML outputs escape supplied data, restrict content with a policy and contain no external scripts/assets. Review is heuristic, not a clinical, legal or factual safety check. Host reminder setup is opt-in and cannot authorize background text processing.
