---
title: 'Migrating from eslint-plugin-security in 5 Minutes'
published: false
description: "Drop-in replacement with 6x more coverage. Here's the quick migration guide."
tags: javascript, eslint, security, migration
cover_image:
canonical_url:
---

# Migrating from eslint-plugin-security in 5 Minutes

Using `eslint-plugin-security`? Here's a quick upgrade path to **6x more coverage**.

## The Numbers

| Metric            | eslint-plugin-security | eslint-plugin-secure-coding |
| ----------------- | ---------------------- | --------------------------- |
| Rules             | 13                     | 89                          |
| OWASP Top 10      | Partial                | Full                        |
| OWASP Mobile      | None                   | Full (30 rules)             |
| CWE References    | No                     | Yes                         |
| CVSS Scores       | No                     | Yes                         |
| AI-Ready Messages | No                     | Yes                         |

## Step 1: Uninstall Old Plugin

```bash
npm uninstall eslint-plugin-security
```

## Step 2: Install New Plugin

```bash
npm install --save-dev eslint-plugin-secure-coding
```

## Step 3: Update Config

### Before (Legacy Config)

```javascript
// .eslintrc.js
module.exports = {
  plugins: ['security'],
  extends: ['plugin:security/recommended'],
};
```

### After (Flat Config)

```javascript
// eslint.config.js
import secureCoding from 'eslint-plugin-secure-coding';

export default [secureCoding.configs.recommended];
```

## Step 4: Run ESLint

```bash
npx eslint .
```

That's it. You now have 89 rules instead of 13.

## Rule Mapping

Most rules have direct equivalents:

| eslint-plugin-security           | eslint-plugin-secure-coding      |
| -------------------------------- | -------------------------------- |
| `detect-eval-with-expression`    | `detect-eval-with-expression`    |
| `detect-object-injection`        | `detect-object-injection`        |
| `detect-non-literal-regexp`      | `detect-non-literal-regexp`      |
| `detect-non-literal-fs-filename` | `detect-non-literal-fs-filename` |
| `detect-child-process`           | `detect-child-process`           |
| (no equivalent)                  | `no-weak-crypto`                 |
| (no equivalent)                  | `no-insecure-cookie-settings`    |
| (no equivalent)                  | + 70 more rules                  |

## New Presets

| Preset                | Use Case                                       |
| --------------------- | ---------------------------------------------- |
| `recommended`         | Drop-in replacement for `security/recommended` |
| `strict`              | Maximum security (all 89 as errors)            |
| `owasp-top-10`        | Web application compliance                     |
| `owasp-mobile-top-10` | Mobile apps (React Native, etc.)               |

## Using Multiple Presets

```javascript
import secureCoding from 'eslint-plugin-secure-coding';

export default [
  secureCoding.configs.recommended, // Base
  {
    files: ['apps/web/**'],
    ...secureCoding.configs['owasp-top-10'], // Extra for web
  },
  {
    files: ['services/payments/**'],
    ...secureCoding.configs.strict, // Maximum for critical
  },
];
```

## Error Message Upgrade

### Before

```bash
Potentially unsafe use of eval
```

### After

```bash
🔒 CWE-95 OWASP:A03 CVSS:9.8 | Dynamic code execution detected | CRITICAL
   Fix: Avoid eval with user input. Use JSON.parse() or a safe parser.
```

AI assistants can now understand and fix these automatically.

## Quick Install

```bash
# One-liner migration
npm uninstall eslint-plugin-security && npm install --save-dev eslint-plugin-secure-coding
```

```javascript
// eslint.config.js
import secureCoding from 'eslint-plugin-secure-coding';
export default [secureCoding.configs.recommended];
```

**5 minutes. 6x coverage. Zero breaking changes.**

---

📦 [npm: eslint-plugin-secure-coding](https://www.npmjs.com/package/eslint-plugin-secure-coding)
📖 [Full rule list](https://github.com/ofri-peretz/eslint/tree/main/packages/eslint-plugin-secure-coding/docs/rules)

---

🚀 **Follow me for more security articles & updates:**
[GitHub](https://github.com/ofri-peretz) | [LinkedIn](https://www.linkedin.com/in/ofri-peretz/)
