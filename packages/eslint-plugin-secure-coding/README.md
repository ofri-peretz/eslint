# eslint-plugin-secure-coding

<p align="center">
  <a href="https://eslint.interlace.tools" target="blank"><img src="https://eslint.interlace.tools/eslint-interlace-logo-light.svg" alt="ESLint Interlace Logo" width="120" /></a>
</p>

<p align="center">
  General secure coding practices and OWASP compliance for JavaScript/TypeScript.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/eslint-plugin-secure-coding" target="_blank"><img src="https://img.shields.io/npm/v/eslint-plugin-secure-coding.svg" alt="NPM Version" /></a>
  <a href="https://www.npmjs.com/package/eslint-plugin-secure-coding" target="_blank"><img src="https://img.shields.io/npm/dm/eslint-plugin-secure-coding.svg" alt="NPM Downloads" /></a>
  <a href="https://opensource.org/licenses/MIT" target="_blank"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="Package License" /></a>
  <a href="https://app.codecov.io/gh/ofri-peretz/eslint/components?components%5B0%5D=secure-coding" target="_blank"><img src="https://codecov.io/gh/ofri-peretz/eslint/graph/badge.svg?component=secure-coding" alt="Codecov" /></a>
  <a href="https://github.com/ofri-peretz/eslint" target="_blank"><img src="https://img.shields.io/badge/Dec_2025-blue?logo=rocket&logoColor=white" alt="Dec 2025" /></a>
</p>

## Description

General secure coding practices and OWASP compliance for JavaScript/TypeScript.

## Philosophy

**Interlace** fosters **strength through integration**. Instead of stacking isolated rules, we **interlace** security directly into your workflow to create a resilient fabric of code. We believe tools should **guide rather than gatekeep**, providing educational feedback that strengthens the developer with every interaction.

## Getting Started

- To check out the [guide](https://eslint.interlace.tools/docs/secure-coding), visit [eslint.interlace.tools](https://eslint.interlace.tools). 📚
- 要查看中文 [指南](https://eslint.interlace.tools/docs/secure-coding), 请访问 [eslint.interlace.tools](https://eslint.interlace.tools). 📚
- [가이드](https://eslint.interlace.tools/docs/secure-coding) 문서는 [eslint.interlace.tools](https://eslint.interlace.tools)에서 확인하실 수 있습니다. 📚
- [ガイド](https://eslint.interlace.tools/docs/secure-coding)は [eslint.interlace.tools](https://eslint.interlace.tools)でご確認ください。 📚

```bash
npm install eslint-plugin-secure-coding --save-dev
```

## 📋 Available Presets (policy tiers)
| Preset                    | Description                                                     |
| ------------------------- | --------------------------------------------------------------- |
| **`recommended`**         | Balanced security for most projects (Web + key Mobile security) |
| **`strict`**              | Maximum security enforcement (all rules as errors)              |
| **`owasp-top-10`**        | OWASP Top 10 Web 2021 compliance focused                        |
| **`owasp-mobile-top-10`** | OWASP Mobile Top 10 2024 compliance focused                     |

---

## 📚 Documentation
---

### What an error looks like (LLM-optimized)

```bash
src/api.ts
  42:15  error  🔒 CWE-89 OWASP:A03-Injection CVSS:9.8 | SQL Injection detected | CRITICAL [SOC2,PCI-DSS,HIPAA]
                    Fix: Use parameterized query: db.query("SELECT * FROM users WHERE id = ?", [userId]) | https://owasp.org/...
```

Each finding includes:

- CWE + OWASP + CVSS for compliance mapping
- Severity and compliance tags
- A ready-to-apply fix suggestion and a doc link (LLM-friendly)

---

## 🏢 Enterprise Integration Example
```bash
# Install once at the repo root
pnpm add -D eslint-plugin-secure-coding

# eslint.config.js (org-standard)
import secureCoding from 'eslint-plugin-secure-coding';

export default [
  // Baseline for all services (balanced)
  secureCoding.configs.recommended,

  // Add OWASP Top 10 enforcement for internet-facing apps
  {
    files: ['apps/web/**'],
    ...secureCoding.configs['owasp-top-10'],
  },

  // Add OWASP Mobile Top 10 for mobile/native apps
  {
    files: ['apps/mobile/**'],
    ...secureCoding.configs['owasp-mobile-top-10'],
  },

  // Force strict mode for critical backend services
  {
    files: ['services/payments/**', 'services/auth/**'],
    ...secureCoding.configs.strict,
  },
];
```

What this gives organizations:

- OWASP/CWE/CVSS metadata in every finding for compliance mapping
- Consistent, LLM-ready fixes that teammates and AI can apply safely
- Tiered policies (baseline, OWASP-focused, strict) per surface area

---

## 🧭 Type-safe rule configuration (eslint.config.ts)
This package ships rule option types to keep flat configs type-safe.

```ts
import type { Linter } from 'eslint';
import type { AllSecurityRulesOptions } from 'eslint-plugin-secure-coding/types';
import secureCoding from 'eslint-plugin-secure-coding';

const secureCodingRuleOptions: AllSecurityRulesOptions = {
  'no-sql-injection': { strategy: 'parameterize' },
  'no-unsafe-deserialization': { allowJSON: false },
};

export default [
  {
    ...secureCoding.configs.recommended,
    rules: {
      ...secureCoding.configs.recommended.rules,
      'secure-coding/no-sql-injection': [
        'error',
        secureCodingRuleOptions['no-sql-injection'],
      ],
      'secure-coding/no-unsafe-deserialization': [
        'error',
        secureCodingRuleOptions['no-unsafe-deserialization'],
      ],
    },
  },
  secureCoding.configs['owasp-top-10'],
  secureCoding.configs.strict,
] satisfies Linter.FlatConfig[];
```

---

## 🤖 LLM & AI Integration
This plugin is optimized for ESLint's [Model Context Protocol (MCP)](https://eslint.org/docs/latest/use/mcp), enabling AI assistants like **Cursor**, **GitHub Copilot**, and **Claude** to:

- Understand the exact vulnerability type via CWE references
- Apply the correct fix using structured guidance
- Provide educational context to developers

```json
// .cursor/mcp.json
{
  "mcpServers": {
    "eslint": {
      "command": "npx",
      "args": ["@eslint/mcp@latest"]
    }
  }
}
```

---

## 🔒 Privacy
This plugin runs **100% locally**. No data ever leaves your machine.

---

**Q: Does it work with ESLint 9 flat config?**
A: Yes, fully compatible.

## Rules

**Legend**

| Icon | Description |
| :---: | :--- |
| 💼 | **Recommended**: Included in the recommended preset. |
| ⚠️ | **Warns**: Set towarn in recommended preset. |
| 🔧 | **Auto-fixable**: Automatically fixable by the `--fix` CLI option. |
| 💡 | **Suggestions**: Providing code suggestions in IDE. |
| 🚫 | **Deprecated**: This rule is deprecated. |

| Rule | CWE | OWASP | CVSS | Description | 💼 | ⚠️ | 🔧 | 💡 | 🚫 |
| :--- | :---: | :---: | :---: | :--- | :---: | :---: | :---: | :---: | :---: |
| [no-sql-injection](./docs/rules/no-sql-injection.md) | CWE-89 |  | 9.8 | Injection Prevention | 💼 |  |  |  |  |
| [database-injection](./docs/rules/database-injection.md) | CWE-89 |  | 9.8 | Injection Prevention | 💼 |  |  |  |  |
| [detect-eval-with-expression](./docs/rules/detect-eval-with-expression.md) | CWE-95 |  | 9.8 | Injection Prevention | 💼 |  |  |  |  |
| [detect-child-process](./docs/rules/detect-child-process.md) | CWE-78 |  | 9.8 | Injection Prevention | 💼 |  |  |  |  |
| [no-unsafe-dynamic-require](./docs/rules/no-unsafe-dynamic-require.md) | CWE-95 |  | 7.5 | Injection Prevention | 💼 |  |  |  |  |
| [no-graphql-injection](./docs/rules/no-graphql-injection.md) | CWE-943 |  | 8.6 | Injection Prevention | 💼 |  |  |  |  |
| [no-xxe-injection](./docs/rules/no-xxe-injection.md) | CWE-611 |  | 9.1 | Injection Prevention | 💼 |  |  |  |  |
| [no-xpath-injection](./docs/rules/no-xpath-injection.md) | CWE-643 |  | 9.8 | Injection Prevention | 💼 |  |  |  |  |
| [no-ldap-injection](./docs/rules/no-ldap-injection.md) | CWE-90 |  | 9.8 | Injection Prevention | 💼 |  |  |  |  |
| [no-directive-injection](./docs/rules/no-directive-injection.md) | CWE-94 |  | 8.8 | Injection Prevention | 💼 |  |  |  |  |
| [no-format-string-injection](./docs/rules/no-format-string-injection.md) | CWE-134 |  | 9.8 | Injection Prevention | 💼 |  |  |  |  |
| [no-http-urls](./docs/rules/no-http-urls.md) | CWE-319 |  | 7.5 | Mobile Security | 💼 |  |  |  |  |
| [no-hardcoded-credentials](./docs/rules/no-hardcoded-credentials.md) | CWE-798 |  | 7.5 | Mobile Security | 💼 |  | 🔧 | 💡 |  |
| [no-credentials-in-storage-api](./docs/rules/no-credentials-in-storage-api.md) | CWE-522 |  | 7.5 | Mobile Security | 💼 |  |  |  |  |
| [no-credentials-in-query-params](./docs/rules/no-credentials-in-query-params.md) | CWE-598 |  | 7.5 | Mobile Security | 💼 |  |  |  |  |
| [no-allow-arbitrary-loads](./docs/rules/no-allow-arbitrary-loads.md) | CWE-295 |  | 7.5 | Mobile Security |  |  |  |  |  |
| [no-disabled-certificate-validation](./docs/rules/no-disabled-certificate-validation.md) | CWE-295 |  | 7.5 | Mobile Security |  |  |  |  |  |
| [require-https-only](./docs/rules/require-https-only.md) | CWE-319 |  | 7.5 | Mobile Security | 💼 |  |  |  |  |
| [require-network-timeout](./docs/rules/require-network-timeout.md) | CWE-400 |  | 7.5 | Mobile Security |  |  |  |  |  |
| [detect-weak-password-validation](./docs/rules/detect-weak-password-validation.md) | CWE-521 |  | 7.5 | Mobile Security |  |  |  |  |  |
| [no-client-side-auth-logic](./docs/rules/no-client-side-auth-logic.md) | CWE-602 |  | 7.5 | Mobile Security |  |  |  |  |  |
| [no-hardcoded-session-tokens](./docs/rules/no-hardcoded-session-tokens.md) | CWE-798 |  | 9.8 | Mobile Security | 💼 |  |  |  |  |
| [no-unvalidated-deeplinks](./docs/rules/no-unvalidated-deeplinks.md) | CWE-939 |  | 7.5 | Mobile Security | 💼 |  |  |  |  |
| [require-url-validation](./docs/rules/require-url-validation.md) | CWE-601 |  | 7.5 | Mobile Security |  |  |  |  |  |
| [require-mime-type-validation](./docs/rules/require-mime-type-validation.md) | CWE-434 |  | 7.5 | Mobile Security |  |  |  |  |  |
| [no-arbitrary-file-access](./docs/rules/no-arbitrary-file-access.md) | CWE-22 |  | 7.5 | Mobile Security |  |  |  |  |  |
| [no-pii-in-logs](./docs/rules/no-pii-in-logs.md) | CWE-532 |  | 7.5 | Mobile Security |  | ⚠️ |  |  |  |
| [no-tracking-without-consent](./docs/rules/no-tracking-without-consent.md) | CWE-359 |  | 7.5 | Mobile Security |  |  |  |  |  |
| [no-sensitive-data-in-analytics](./docs/rules/no-sensitive-data-in-analytics.md) | CWE-359 |  | 7.5 | Mobile Security |  |  |  |  |  |
| [require-data-minimization](./docs/rules/require-data-minimization.md) | CWE-213 |  | 7.5 | Mobile Security |  |  |  |  |  |
| [no-debug-code-in-production](./docs/rules/no-debug-code-in-production.md) | CWE-489 |  | 7.5 | Mobile Security |  |  |  |  |  |
| [require-code-minification](./docs/rules/require-code-minification.md) | CWE-656 |  | 7.5 | Mobile Security |  |  |  |  |  |
| [no-verbose-error-messages](./docs/rules/no-verbose-error-messages.md) | CWE-209 |  | 7.5 | Mobile Security |  | ⚠️ |  |  |  |
| [require-secure-defaults](./docs/rules/require-secure-defaults.md) | CWE-276 |  | 7.5 | Mobile Security |  |  |  |  |  |
| [no-sensitive-data-in-cache](./docs/rules/no-sensitive-data-in-cache.md) | CWE-524 |  | 7.5 | Mobile Security |  |  |  |  |  |
| [no-data-in-temp-storage](./docs/rules/no-data-in-temp-storage.md) | CWE-312 |  | 7.5 | Mobile Security |  |  |  |  |  |
| [require-secure-deletion](./docs/rules/require-secure-deletion.md) | CWE-459 |  | 7.5 | Mobile Security |  |  |  |  |  |
| [require-storage-encryption](./docs/rules/require-storage-encryption.md) | CWE-311 |  | 7.5 | Mobile Security |  |  |  |  |  |
| [no-unencrypted-local-storage](./docs/rules/no-unencrypted-local-storage.md) | CWE-312 |  | 7.5 | Mobile Security |  |  |  |  |  |
| [require-credential-storage](./docs/rules/require-credential-storage.md) | CWE-522 |  | 7.5 | Mobile Security |  |  |  |  |  |
| [no-exposed-debug-endpoints](./docs/rules/no-exposed-debug-endpoints.md) | CWE-489 |  | 7.5 | Mobile Security |  |  |  |  |  |
| [detect-non-literal-fs-filename](./docs/rules/detect-non-literal-fs-filename.md) | CWE-22 |  | 7.5 | Path & File Security | 💼 |  |  |  |  |
| [no-zip-slip](./docs/rules/no-zip-slip.md) | CWE-22 |  | 8.1 | Path & File Security | 💼 |  |  |  |  |
| [no-toctou-vulnerability](./docs/rules/no-toctou-vulnerability.md) | CWE-367 |  | 7.0 | Path & File Security | 💼 |  |  | 💡 |  |
| [detect-non-literal-regexp](./docs/rules/detect-non-literal-regexp.md) | CWE-400 |  | 7.5 | Regex Security |  | ⚠️ |  |  |  |
| [no-redos-vulnerable-regex](./docs/rules/no-redos-vulnerable-regex.md) | CWE-1333 |  | 7.5 | Regex Security | 💼 |  |  | 💡 |  |
| [no-unsafe-regex-construction](./docs/rules/no-unsafe-regex-construction.md) | CWE-400 |  | 7.5 | Regex Security |  | ⚠️ |  | 💡 |  |
| [detect-object-injection](./docs/rules/detect-object-injection.md) | CWE-915 |  | 7.3 | Object & Prototype |  | ⚠️ |  |  |  |
| [no-unsafe-deserialization](./docs/rules/no-unsafe-deserialization.md) | CWE-502 |  | 9.8 | Object & Prototype | 💼 |  |  |  |  |
| [no-weak-crypto](./docs/rules/no-weak-crypto.md) | CWE-327 |  | 7.5 | Cryptography | 💼 |  |  |  | 🚫 |
| [no-insufficient-random](./docs/rules/no-insufficient-random.md) | CWE-330 |  | 5.3 | Cryptography |  | ⚠️ |  |  | 🚫 |
| [no-timing-attack](./docs/rules/no-timing-attack.md) | CWE-208 |  | 5.9 | Cryptography | 💼 |  |  |  | 🚫 |
| [no-insecure-comparison](./docs/rules/no-insecure-comparison.md) | CWE-697 |  | 5.3 | Cryptography |  | ⚠️ | 🔧 |  | 🚫 |
| [no-insecure-jwt](./docs/rules/no-insecure-jwt.md) | CWE-347 |  | 7.5 | Cryptography | 💼 |  |  |  | 🚫 |
| [no-unvalidated-user-input](./docs/rules/no-unvalidated-user-input.md) | CWE-20 |  | 8.6 | Input Validation & XSS |  | ⚠️ |  |  |  |
| [no-unsanitized-html](./docs/rules/no-unsanitized-html.md) | CWE-79 |  | 6.1 | Input Validation & XSS | 💼 |  |  |  |  |
| [no-unescaped-url-parameter](./docs/rules/no-unescaped-url-parameter.md) | CWE-79 |  | 6.1 | Input Validation & XSS |  | ⚠️ |  |  |  |
| [no-improper-sanitization](./docs/rules/no-improper-sanitization.md) | CWE-116 |  | 7.5 | Input Validation & XSS | 💼 |  |  |  |  |
| [no-improper-type-validation](./docs/rules/no-improper-type-validation.md) | CWE-20 |  | 5.3 | Input Validation & XSS |  | ⚠️ |  |  |  |
| [no-missing-authentication](./docs/rules/no-missing-authentication.md) | CWE-306 |  | 9.8 | Authentication & Authorization |  | ⚠️ |  |  |  |
| [no-privilege-escalation](./docs/rules/no-privilege-escalation.md) | CWE-269 |  | 8.8 | Authentication & Authorization |  | ⚠️ |  |  |  |
| [no-weak-password-recovery](./docs/rules/no-weak-password-recovery.md) | CWE-640 |  | 9.8 | Authentication & Authorization | 💼 |  |  |  |  |
| [no-insecure-cookie-settings](./docs/rules/no-insecure-cookie-settings.md) | CWE-614 |  | 5.3 | Session & Cookies |  | ⚠️ |  |  | 🚫 |
| [no-missing-csrf-protection](./docs/rules/no-missing-csrf-protection.md) | CWE-352 |  | 8.8 | Session & Cookies |  | ⚠️ |  |  | 🚫 |
| [no-document-cookie](./docs/rules/no-document-cookie.md) | CWE-565 |  | 4.3 | Session & Cookies |  | ⚠️ |  | 💡 |  |
| [no-missing-cors-check](./docs/rules/no-missing-cors-check.md) | CWE-942 |  | 7.5 | Network & Headers |  | ⚠️ |  |  | 🚫 |
| [no-missing-security-headers](./docs/rules/no-missing-security-headers.md) | CWE-693 |  | 5.3 | Network & Headers |  | ⚠️ |  | 💡 | 🚫 |
| [no-insecure-redirects](./docs/rules/no-insecure-redirects.md) | CWE-601 |  | 6.1 | Network & Headers |  | ⚠️ |  | 💡 |  |
| [no-unencrypted-transmission](./docs/rules/no-unencrypted-transmission.md) | CWE-319 |  | 7.5 | Network & Headers |  | ⚠️ |  |  |  |
| [no-clickjacking](./docs/rules/no-clickjacking.md) | CWE-1021 |  | 6.1 | Network & Headers | 💼 |  |  |  | 🚫 |
| [no-exposed-sensitive-data](./docs/rules/no-exposed-sensitive-data.md) | CWE-200 |  | 7.5 | Data Exposure | 💼 |  |  |  |  |
| [no-sensitive-data-exposure](./docs/rules/no-sensitive-data-exposure.md) | CWE-532 |  | 5.5 | Data Exposure |  | ⚠️ |  | 💡 |  |
| [no-buffer-overread](./docs/rules/no-buffer-overread.md) | CWE-126 |  | 7.5 | Buffer, Memory & DoS | 💼 |  |  |  |  |
| [no-unlimited-resource-allocation](./docs/rules/no-unlimited-resource-allocation.md) | CWE-770 |  | 7.5 | Buffer, Memory & DoS | 💼 |  |  |  |  |
| [no-unchecked-loop-condition](./docs/rules/no-unchecked-loop-condition.md) | CWE-835 |  | 7.5 | Buffer, Memory & DoS | 💼 |  |  |  |  |
| [no-electron-security-issues](./docs/rules/no-electron-security-issues.md) | CWE-693 |  | 8.8 | Platform-Specific | 💼 |  |  |  |  |
| [no-insufficient-postmessage-validation](./docs/rules/no-insufficient-postmessage-validation.md) | CWE-346 |  | 8.8 | Platform-Specific | 💼 |  |  |  |  |
| [Deprecated](https://eslint.interlace.tools/docs/secure-coding/rules/Deprecated) |  |  |  | Deprecated Rules |  |  |  |  |  |
| [Plugin](https://eslint.interlace.tools/docs/secure-coding/rules/Plugin) |  |  |  | Description |  |  |  |  |  |

## 🔗 Related ESLint Plugins

Part of the **Interlace ESLint Ecosystem** — AI-native security plugins with LLM-optimized error messages:

| Plugin | NPM | Downloads | License | Description |
| :--- | :---: | :---: | :---: | :--- |
| [`eslint-plugin-secure-coding`](https://www.npmjs.com/package/eslint-plugin-secure-coding) | [![npm](https://img.shields.io/npm/v/eslint-plugin-secure-coding.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-secure-coding) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-secure-coding.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-secure-coding) | [![license](https://img.shields.io/npm/l/eslint-plugin-secure-coding.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-secure-coding) | General security rules & OWASP guidelines. |
| [`eslint-plugin-pg`](https://www.npmjs.com/package/eslint-plugin-pg) | [![npm](https://img.shields.io/npm/v/eslint-plugin-pg.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-pg) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-pg.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-pg) | [![license](https://img.shields.io/npm/l/eslint-plugin-pg.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-pg) | PostgreSQL security & best practices. |
| [`eslint-plugin-crypto`](https://www.npmjs.com/package/eslint-plugin-crypto) | [![npm](https://img.shields.io/npm/v/eslint-plugin-crypto.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-crypto) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-crypto.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-crypto) | [![license](https://img.shields.io/npm/l/eslint-plugin-crypto.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-crypto) | NodeJS Cryptography security rules. |
| [`eslint-plugin-jwt`](https://www.npmjs.com/package/eslint-plugin-jwt) | [![npm](https://img.shields.io/npm/v/eslint-plugin-jwt.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-jwt) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-jwt.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-jwt) | [![license](https://img.shields.io/npm/l/eslint-plugin-jwt.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-jwt) | JWT security & best practices. |
| [`eslint-plugin-browser-security`](https://www.npmjs.com/package/eslint-plugin-browser-security) | [![npm](https://img.shields.io/npm/v/eslint-plugin-browser-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-browser-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-browser-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-browser-security) | [![license](https://img.shields.io/npm/l/eslint-plugin-browser-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-browser-security) | Browser-specific security & XSS prevention. |
| [`eslint-plugin-vercel-ai-security`](https://www.npmjs.com/package/eslint-plugin-vercel-ai-security) | [![npm](https://img.shields.io/npm/v/eslint-plugin-vercel-ai-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-vercel-ai-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-vercel-ai-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-vercel-ai-security) | [![license](https://img.shields.io/npm/l/eslint-plugin-vercel-ai-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-vercel-ai-security) | Vercel AI SDK security rules. |
| [`eslint-plugin-express-security`](https://www.npmjs.com/package/eslint-plugin-express-security) | [![npm](https://img.shields.io/npm/v/eslint-plugin-express-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-express-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-express-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-express-security) | [![license](https://img.shields.io/npm/l/eslint-plugin-express-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-express-security) | Express.js security hardening rules. |
| [`eslint-plugin-lambda-security`](https://www.npmjs.com/package/eslint-plugin-lambda-security) | [![npm](https://img.shields.io/npm/v/eslint-plugin-lambda-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-lambda-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-lambda-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-lambda-security) | [![license](https://img.shields.io/npm/l/eslint-plugin-lambda-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-lambda-security) | AWS Lambda security best practices. |
| [`eslint-plugin-nestjs-security`](https://www.npmjs.com/package/eslint-plugin-nestjs-security) | [![npm](https://img.shields.io/npm/v/eslint-plugin-nestjs-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-nestjs-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-nestjs-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-nestjs-security) | [![license](https://img.shields.io/npm/l/eslint-plugin-nestjs-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-nestjs-security) | NestJS security rules & patterns. |
| [`eslint-plugin-import-next`](https://www.npmjs.com/package/eslint-plugin-import-next) | [![npm](https://img.shields.io/npm/v/eslint-plugin-import-next.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-import-next) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-import-next.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-import-next) | [![license](https://img.shields.io/npm/l/eslint-plugin-import-next.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-import-next) | Next-gen import sorting & architecture. |

## 📄 License

MIT © [Ofri Peretz](https://github.com/ofri-peretz)

<p align="center">
  <a href="https://eslint.interlace.tools/docs/secure-coding"><img src="https://eslint.interlace.tools/images/og-secure-coding.png" alt="ESLint Interlace Plugin" width="100%" /></a>
</p>