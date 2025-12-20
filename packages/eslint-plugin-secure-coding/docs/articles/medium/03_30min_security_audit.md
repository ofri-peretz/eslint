# The 30-Minute Security Audit: Onboarding a New Codebase

_By Ofri Peretz_

---

You just inherited a codebase. Maybe it's an acquisition. Maybe a departing senior engineer. Maybe you're the new CTO and nobody can explain why there's a `utils/legacy_auth.js` file with 3,000 lines.

You need to know: **How bad is it?**

## The Old Way: Pain

Traditionally, security audits take weeks. You bring in consultants. They run tools. They produce a 200-page PDF. You file it and forget.

But you don't have weeks. You need a pulse check _today_.

## The 30-Minute Approach

Here's how I assess a new codebase in under 30 minutes using [eslint-plugin-secure-coding](https://www.npmjs.com/package/eslint-plugin-secure-coding).

### Step 1: Install (2 minutes)

```bash
npm install --save-dev eslint-plugin-secure-coding
```

### Step 2: Configure for Maximum Detection (3 minutes)

```javascript
// eslint.config.js
import secureCoding from 'eslint-plugin-secure-coding';

export default [secureCoding.configs.strict];
```

The `strict` preset enables all 89 rules as errors—perfect for an initial scan.

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
  42:10  error  🔒 CWE-327 OWASP:A02-Crypto-Failures CVSS:7.5 | Weak cryptographic algorithm (MD5) | HIGH
                   Fix: Use a strong algorithm: crypto.createHash('sha256')
```

### Step 4: Analyze and Prioritize (20 minutes)

Parse the output by rule to build your risk heatmap:

```bash
cat security-audit.json | jq '.[] | .messages[] | .ruleId' | sort | uniq -c | sort -rn
```

You now have a prioritized list:

- **15 hits** on [no-sql-injection](https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-secure-coding/docs/rules/no-sql-injection.md) = 🔴 Critical
- **8 hits** on [no-hardcoded-credentials](https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-secure-coding/docs/rules/no-hardcoded-credentials.md) = 🔴 Critical
- **3 hits** on [no-weak-crypto](https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-secure-coding/docs/rules/no-weak-crypto.md) = 🟡 Medium

## What This Tells You

In 30 minutes, you know:

1. **The attack surface** — Which OWASP categories are most exposed
2. **The hotspots** — Which files have the most issues
3. **The culture** — Did the previous team care about security or not?

This isn't a replacement for a full penetration test. But it's a **data-driven starting point** for your first board meeting, your first architecture review, or your first honest conversation with the team.

## Bonus: Let AI Fix It

The structured error messages are designed for AI coding assistants like Cursor and Copilot. Once you've identified your top issues, let the AI suggest fixes—most can be resolved with a single keystroke.

## What's Next?

Once you've done your 30-minute audit:

1. **Enforce it** — Add the plugin to your CI to block new issues
2. **Automate compliance** — Use the built-in SOC2/PCI tags for audit evidence
3. **Track progress** — Re-run weekly to measure remediation velocity

## The Punch Line: Day One Intel

You don't need to be a security expert to run this audit. You need 30 minutes, a terminal, and the willingness to see the truth.

The best time to know your risk was before you signed. The second best time is today.

---

[Ofri Peretz](https://www.linkedin.com/in/ofri-peretz/) | [GitHub](https://github.com/ofri-peretz)

**Keywords**: Security Audit, Code Review, Technical Due Diligence, Codebase Assessment, OWASP, Engineering Management
