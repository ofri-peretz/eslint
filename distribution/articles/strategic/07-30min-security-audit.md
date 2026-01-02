---
title: 'The 30-Minute Security Audit: Onboarding a New Codebase'
published: true
description: 'How to assess a new codebase in under 30 minutes using automated security linting. Perfect for acquisitions, new hires, or CTOs inheriting legacy code.'
tags: security, javascript, tutorial, devsecops
cover_image: https://dev-to-uploads.s3.amazonaws.com/uploads/articles/wm4j62nzhhf6uwy1z89f.png
series: Security Workflows
---

You just inherited a codebase. Maybe it's an acquisition. Maybe a departing senior engineer. Maybe you're the new CTO and nobody can explain why there's a `utils/legacy_auth.js` file with 3,000 lines.

You need to know: **How bad is it?**

## The Old Way: Pain

Traditionally, security audits take weeks. You bring in consultants. They run tools. They produce a 200-page PDF. You file it and forget.

But you don't have weeks. You need a pulse check _today_.

## The 30-Minute Approach

Here's how I assess a new codebase in under 30 minutes.

### Step 1: Install (2 minutes)

```bash
npm install --save-dev eslint-plugin-secure-coding
npm install --save-dev eslint-plugin-pg
npm install --save-dev eslint-plugin-crypto
```

### Step 2: Configure for Maximum Detection (3 minutes)

```javascript
// eslint.config.js
import secureCoding from 'eslint-plugin-secure-coding';
import pg from 'eslint-plugin-pg';
import crypto from 'eslint-plugin-crypto';

export default [
  secureCoding.configs.strict,
  pg.configs.recommended,
  crypto.configs.recommended,
];
```

The `strict` preset enables all 75 secure-coding rules as errors—perfect for an initial scan.

### Step 3: Run the Audit (5 minutes)

```bash
npx eslint . --format=json > security-audit.json
```

You'll see violations like:

```bash
src/auth/login.ts
  18:5   error  🔒 CWE-798 OWASP:A07-Auth-Failures CVSS:7.5 | Hardcoded API key detected | HIGH
                   Fix: Move to environment variable: process.env.STRIPE_API_KEY

src/utils/crypto.ts
  42:10  error  🔒 CWE-327 OWASP:A02-Crypto-Failures CVSS:7.5 | Weak algorithm (MD5) | HIGH
                   Fix: Use a strong algorithm: crypto.createHash('sha256')
```

### Step 4: Analyze and Prioritize (20 minutes)

Parse the output by rule to build your risk heatmap:

```bash
cat security-audit.json | jq '.[] | .messages[] | .ruleId' | sort | uniq -c | sort -rn
```

You now have a prioritized list:

- **15 hits** on `pg/no-unsafe-query` = 🔴 Critical
- **8 hits** on `secure-coding/no-hardcoded-credentials` = 🔴 Critical
- **3 hits** on `crypto/no-weak-hash` = 🟡 Medium

## What This Tells You

In 30 minutes, you know:

1. **The attack surface** — Which OWASP categories are most exposed
2. **The hotspots** — Which files have the most issues
3. **The culture** — Did the previous team care about security or not?

This isn't a replacement for a full penetration test. But it's a **data-driven starting point** for your first board meeting.

## Bonus: Let AI Fix It

The structured error messages are designed for AI coding assistants. Once you've identified your top issues, let the AI suggest fixes—most can be resolved with a single keystroke.

## What's Next?

1. **Enforce it** — Add the plugin to your CI to block new issues
2. **Automate compliance** — Use the built-in SOC2/PCI tags for audit evidence
3. **Track progress** — Re-run weekly to measure remediation velocity

---

## Quick Install

📦 [`eslint-plugin-secure-coding`](https://npmjs.com/package/eslint-plugin-secure-coding) — 75 security rules
📦 [`eslint-plugin-pg`](https://npmjs.com/package/eslint-plugin-pg) — PostgreSQL security
📦 [`eslint-plugin-crypto`](https://npmjs.com/package/eslint-plugin-crypto) — Cryptography security

{% cta https://github.com/ofri-peretz/eslint %}
⭐ Star on GitHub
{% endcta %}

---

🚀 **What's the worst thing you've found inheriting a codebase? Share your horror stories!**

[GitHub](https://github.com/interlace-collie) | [X](https://x.com/ofriperetzdev) | [LinkedIn](https://linkedin.com/in/ofri-peretz) | [Dev.to](https://dev.to/ofriperetz)