# Security Policy

## Supported versions

The latest release of `@medu/lerno` receives security fixes.

## Reporting a vulnerability

Please **do not** open a public issue for a security problem. Report it privately through GitHub's
private vulnerability reporting: open the repository's **Security** tab and choose **Report a
vulnerability**. If that is unavailable, contact a maintainer directly on GitHub.

Include the affected version, a short description and, when possible, a minimal document or snippet
that reproduces the problem. We aim to acknowledge reports within three working days and to ship a
fix or a mitigation plan within thirty days.

## Threat model

Lerno renders documents that may come from untrusted authors, so:

- Documents are validated through the zod schema before a session sees them; schema migrations are
  pure and never execute document content.
- The core performs no network, filesystem or storage access of its own; all of that is behind
  `LernoHost` adapters that the application owns.
- Content is data, never code: nothing in the runtime evaluates strings as JavaScript.
