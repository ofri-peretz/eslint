# Security Policy

## Supported Versions

This is a monorepo of independently versioned packages — published versions range
from `0.x` to `8.x`, so a single "1.x" row would be meaningless.

| Scope                                    | Supported          |
| ---------------------------------------- | ------------------ |
| Latest published version of each package | :white_check_mark: |
| Any earlier version                      | :x:                |

Security fixes are released as a new patch or minor of the affected package. We do
not backport to older majors; upgrade to the latest version of the package instead.
Current versions for every package are listed on npm:
https://www.npmjs.com/search?q=eslint-plugin%20interlace

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
| Public advisory           | After the fix ships, crediting the reporter            |

We appreciate responsible disclosure and will credit researchers who help us improve
security. For coordinated-disclosure guidance, see GitHub's documentation:
https://docs.github.com/en/code-security/security-advisories/guidance-on-reporting-and-writing-information-about-vulnerabilities
