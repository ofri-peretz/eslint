# Security Policy

## Supported Versions

This is a monorepo of independently versioned packages — published versions range
from `0.x` to `8.x`, so a single "1.x" row would be meaningless.

| Scope                                    | Supported          |
| ---------------------------------------- | ------------------ |
| Latest published version of each package | :white_check_mark: |
| Any earlier version                      | :x:                |

Security fixes ship as a new patch or minor of the affected package wherever the
fix is backward-compatible. When a fix necessarily changes public API or rule
behaviour — for example tightening a rule that was silently under-reporting — it
ships as a **major**, and the advisory names the breaking change and the migration
path. We do not backport to older majors; upgrade to the latest version instead.

The canonical inventory of published packages and their current versions is
generated from this repository, not from an npm search:
[`apps/docs/src/data/plugin-stats.json`](apps/docs/src/data/plugin-stats.json).

## Reporting a Vulnerability

We take security issues seriously. If you discover a security vulnerability in this
project, please **DO NOT** open a public issue.

Instead, please report it privately through either channel:

1. **GitHub Security Advisories (preferred):** open a private report at
   https://github.com/ofri-peretz/eslint/security/advisories/new
2. **Email:** ofriperetzdev@gmail.com

In your report, please include:

- A description of the vulnerability
- Steps to reproduce the issue
- The version of the package you are using
- Any relevant code snippets or configurations

## Disclosure timeline

| Stage                     | Target                                                 |
| ------------------------- | ------------------------------------------------------ |
| Acknowledgement of report | Within 48 hours                                        |
| Initial assessment        | Within 5 business days                                 |
| Fix released              | Within 30 days for high/critical, 90 days for the rest |
| Public advisory           | After the fix ships                                    |

We appreciate responsible disclosure. Advisories credit the reporter **only with
their explicit consent** — tell us the name or handle you want used, or ask to stay
anonymous, and we will honour either. For coordinated-disclosure guidance, see
GitHub's documentation:
https://docs.github.com/en/code-security/security-advisories/guidance-on-reporting-and-writing-information-about-vulnerabilities
