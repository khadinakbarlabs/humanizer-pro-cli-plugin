# Security reporting

Report suspected vulnerabilities privately to hello@khadinakbar.com with the subject “Humanizer PRO plugin security”. Include the affected version, expected behavior, impact, and safe reproduction steps. Never include passwords, access tokens, private customer text or payment data. We investigate reports and coordinate corrections with the reporter.

The supported release uses local macOS or Linux, Node.js 20.11 or newer, and a same-computer browser. OAuth uses PKCE, unpredictable state and a loopback-only callback. Local token files rely on private filesystem permissions and are not encrypted. Do not weaken browser or sandbox controls to connect. Keep your operating system, browser and Node.js maintained, and delete local tokens with `logout` on shared computers.

The plugin has no dependency installation, automatic hooks, token imports, purchase operations or background jobs. Humanizer PRO endpoints and third-party text processors are disclosed in the README and privacy notice.
