---
title: 'The Open Source Maintainer Security Playbook'
published: false
description: 'Maintaining an npm package? Here is how to protect your users (and yourself) from supply chain attacks.'
tags: opensource, security, npm, javascript
cover_image:
series: Open Source
---

If you maintain an npm package with more than 1,000 weekly downloads, you're a target.

Supply chain attacks increased **742%** from 2019 to 2023 (Sonatype). Here's how to protect your users.

## The Threat Model

### What Attackers Want

1. **Credential theft** - npm tokens, AWS keys
2. **Cryptomining** - postinstall scripts
3. **Data exfiltration** - send telemetry home
4. **Ransomware staging** - establish persistence

### How They Get In

1. **Social engineering** - "I'll help maintain this!"
2. **Typosquatting** - `lodash` vs `1odash`
3. **Account compromise** - weak passwords, no MFA
4. **Dependency confusion** - private package names

## The Defense Checklist

### 1. Secure Your npm Account

```bash
# Enable 2FA (required for critical packages)
npm profile enable-2fa auth-and-writes

# Use a strong, unique password
# Store in password manager

# Audit access
npm access ls-collaborators <package>
```

### 2. Protect Your Tokens

```bash
# Use automation tokens for CI (limited scope)
npm token create --read-only --cidr=192.168.1.0/24

# Rotate tokens regularly
npm token list
npm token revoke <token-id>

# Never commit tokens
echo ".npmrc" >> .gitignore
```

### 3. Lock Down Publishing

```yaml
# .github/workflows/publish.yml
- name: Publish to npm
  env:
    NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
  run: |
    npm publish --provenance --access public
```

**Key**: Use `--provenance` to sign packages with GitHub Actions OIDC.

### 4. Audit Your Dependencies

```bash
# Before each release
npm audit --audit-level=moderate

# Check for malicious packages
npx socket-security/cli scan
```

### 5. Minimize Attack Surface

```json
// package.json
{
  "files": ["dist"], // Only publish dist
  "scripts": {
    // ❌ Avoid postinstall scripts
    // "postinstall": "node setup.js"
  }
}
```

### 6. Add Security Policy

```markdown
# SECURITY.md

## Reporting Vulnerabilities

Please report security issues to security@yourpackage.dev

Do NOT open public issues for security vulnerabilities.

We aim to respond within 48 hours.
```

### 7. Sign Your Commits

```bash
# Generate GPG key
gpg --full-generate-key

# Configure git
git config --global commit.gpgsign true
git config --global user.signingkey YOUR_KEY_ID
```

## The Release Checklist

Before every publish:

- [ ] All CI checks pass
- [ ] Dependencies audited
- [ ] Changelog updated
- [ ] Version bumped correctly
- [ ] Publishing from main branch
- [ ] Using `--provenance` flag

```bash
# Safe publish command
git checkout main
git pull
npm run test
npm audit
npm version patch
npm publish --provenance --access public
git push --follow-tags
```

## Responding to Incidents

### If You're Compromised

1. **npm token revoked** - `npm token revoke`
2. **Publish deprecation** - `npm deprecate package@bad-version "Security issue - please upgrade"`
3. **GitHub advisory** - Create security advisory
4. **Notify users** - Tweet, blog post, email list

### Template Disclosure

```markdown
## Security Advisory: [Package Name] [Version]

**Severity**: [Critical/High/Medium/Low]
**CVE**: [If assigned]

### Impact

[What can attackers do?]

### Affected Versions

[Which versions are affected?]

### Mitigation

[How to protect yourself]

### Timeline

- [Date]: Issue discovered
- [Date]: Fix released
- [Date]: Advisory published
```

---


---

🚀 **What's your npm security setup? Share your tips!**


{% cta https://github.com/ofri-peretz/eslint %}
⭐ Star on GitHub
{% endcta %}
[GitHub](https://github.com/interlace-collie) | [X](https://x.com/ofriperetzdev) | [LinkedIn](https://linkedin.com/in/ofri-peretz) | [Dev.to](https://dev.to/ofriperetz)
