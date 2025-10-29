# Security Policy

## Supported Versions

We release patches for security vulnerabilities. Which versions are eligible for receiving such patches depends on the CVSS v3.0 Rating:

| Version | Supported          |
| ------- | ------------------ |
| 0.0.x   | :white_check_mark: |

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

Instead, please report them via email to [ofriperetzdev@gmail.com](mailto:ofriperetzdev@gmail.com).

You should receive a response within 48 hours. If for some reason you do not, please follow up via email to ensure we received your original message.

Please include the following information in your report:

* Type of issue (e.g. buffer overflow, SQL injection, cross-site scripting, etc.)
* Full paths of source file(s) related to the manifestation of the issue
* The location of the affected source code (tag/branch/commit or direct URL)
* Any special configuration required to reproduce the issue
* Step-by-step instructions to reproduce the issue
* Proof-of-concept or exploit code (if possible)
* Impact of the issue, including how an attacker might exploit the issue

This information will help us triage your report more quickly.

## Preferred Languages

We prefer all communications to be in English.

## Security Update Process

1. **Report received** - We'll acknowledge receipt within 48 hours
2. **Validation** - We'll validate the vulnerability and assess its impact
3. **Fix development** - We'll develop a fix and create a security advisory
4. **Coordinated disclosure** - We'll work with you on disclosure timing
5. **Release** - We'll release a patched version and publish the advisory
6. **Credit** - We'll credit you in the release notes (unless you prefer to remain anonymous)

## Comments on this Policy

If you have suggestions on how this process could be improved, please submit a pull request.

## Bug Bounty Program

We don't currently have a bug bounty program, but we deeply appreciate security researchers who responsibly disclose vulnerabilities. We'll credit you in our release notes and documentation.

## Security Best Practices for Users

When using Forge.js packages:

1. **Keep dependencies updated** - Regularly update to the latest versions
2. **Use lock files** - Commit `pnpm-lock.yaml` to ensure consistent dependencies
3. **Review rule configurations** - Ensure ESLint rules match your security requirements
4. **Monitor advisories** - Watch this repository for security updates
5. **Report suspicious behavior** - If you notice anything unusual, let us know

## Known Security Considerations

### ESLint Rules and Code Execution

- ESLint rules execute arbitrary JavaScript during linting
- Only install ESLint plugins from trusted sources
- Review rule source code before using in production environments
- Use `--no-ignore` carefully as it may expose sensitive files

### Type-Aware Rules and Performance

- Type-aware rules require TypeScript compiler API access
- This may expose type information in error messages
- Ensure CI/CD environments have appropriate access controls

## Security Disclosure Timeline

We aim to:

- Acknowledge reports within 48 hours
- Provide an initial assessment within 5 business days
- Release a fix within 30 days for critical issues
- Release a fix within 90 days for non-critical issues

Thank you for helping keep Forge.js and our users safe!

