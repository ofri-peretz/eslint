<p align="center">
  <a href="https://eslint.interlace.tools/?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-secure-coding" target="blank"><picture><source media="(prefers-color-scheme: dark)" srcset="https://eslint.interlace.tools/logos/interlace-dark.svg"><img src="https://eslint.interlace.tools/logos/interlace-light.svg" alt="Interlace" height="90" /></picture></a>
  &nbsp;&nbsp;
  <a href="https://oxc.rs" target="_blank"><picture><source media="(prefers-color-scheme: dark)" srcset="https://eslint.interlace.tools/logos/oxlint-dark.svg"><img src="https://eslint.interlace.tools/logos/oxlint-light.svg" alt="oxlint" height="90" /></picture></a>
  &nbsp;&nbsp;
  <a href="https://eslint.org" target="_blank"><picture><source media="(prefers-color-scheme: dark)" srcset="https://eslint.interlace.tools/logos/eslint-dark.svg"><img src="https://eslint.interlace.tools/logos/eslint-light.svg" alt="ESLint" height="90" /></picture></a>
</p>

<p align="center">
  General secure coding practices and OWASP compliance for JavaScript/TypeScript.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/eslint-plugin-secure-coding" target="_blank"><img src="https://img.shields.io/npm/v/eslint-plugin-secure-coding.svg" alt="NPM Version" /></a>
  <a href="https://www.npmjs.com/package/eslint-plugin-secure-coding" target="_blank"><img src="https://img.shields.io/npm/dm/eslint-plugin-secure-coding.svg" alt="NPM Downloads" /></a>
  <a href="https://opensource.org/licenses/MIT" target="_blank"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="Package License" /></a>
  <a href="https://app.codecov.io/gh/ofri-peretz/eslint/components?components%5B0%5D=eslint-plugin-secure-coding" target="_blank"><img src="https://codecov.io/gh/ofri-peretz/eslint/graph/badge.svg?component=eslint-plugin-secure-coding" alt="Codecov" /></a>
  <a href="https://github.com/ofri-peretz/eslint" target="_blank"><img src="https://img.shields.io/badge/Since-Dec_2025-blue?logo=rocket&logoColor=white" alt="Since Dec 2025" /></a>
  <a href="https://scorecard.dev/viewer/?uri=github.com/ofri-peretz/eslint" target="_blank"><img src="https://api.securityscorecards.dev/projects/github.com/ofri-peretz/eslint/badge" alt="OpenSSF Scorecard" /></a>
</p>

> ⭐ If this plugin caught a real bug for you, [**star the repo**](https://github.com/ofri-peretz/eslint) — it's the signal that keeps these rules maintained.

## Description

This plugin provides General secure coding practices and OWASP compliance for JavaScript/TypeScript.

<!-- AUTO-GENERATED:DOCTRINE:START - Do not edit manually -->

- **Why** — a linter nobody reads protects nothing. We would rather miss a finding
  than spend your attention on one that was never real.
- **How** — evidence, not names. A rule fires on what the code *does*, resolved
  through the AST and ESLint's own scope analysis.
- **What** — every finding carries its fix, in prose for a human and as structured
  JSON for an agent. Security rules add a CWE mapping and, where assigned, a CVSS score.

That trade costs recall, and we measure it:
[methodology](https://github.com/ofri-peretz/eslint/blob/main/BENCHMARK-METHODOLOGY.md)
· [results](https://github.com/ofri-peretz/eslint/blob/main/BENCHMARK-RESULTS.md)
· [a false positive is a bug](https://github.com/ofri-peretz/eslint/issues).

<!-- AUTO-GENERATED:DOCTRINE:END -->

## Getting Started

- To check out the [guide](https://eslint.interlace.tools/docs/security/plugin-secure-coding?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-secure-coding), visit [eslint.interlace.tools](https://eslint.interlace.tools/?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-secure-coding). 📚

```bash
npm install eslint-plugin-secure-coding --save-dev
```

**Add to your `eslint.config.mjs` — one line activates 16 security rules:**

```js
import securePlugin from 'eslint-plugin-secure-coding';

export default [
  // Balanced: catches critical issues as errors, lower-confidence rules as warnings
  ...securePlugin.configs.recommended,

  // Zero-tolerance: same 16 rules, all promoted to error (good for CI gates)
  // ...securePlugin.configs['recommended-strict'],
];
```

**Or if you use a legacy `.eslintrc.json`:**

```json
{
  "extends": ["plugin:secure-coding/recommended"]
}
```

> **Using `recommended` already?** Extend your coverage with domain-specific plugins:
> [`eslint-plugin-node-security`](https://www.npmjs.com/package/eslint-plugin-node-security) (crypto, eval, buffer) ·
> [`eslint-plugin-jwt-security`](https://www.npmjs.com/package/eslint-plugin-jwt-security) (JWT auth) ·
> [`eslint-plugin-express-security`](https://www.npmjs.com/package/eslint-plugin-express-security) (Express middleware)

---

## Benchmarks vs competitors (CWE-798 ground truth)
`no-hardcoded-credentials` is part of the [ILB-Flagship benchmark suite](../../benchmarks/suites/ilb-flagship). On the labeled CWE-798 fixture set (Juliet-style: 2 vulnerable + 2 safe files, ground-truthed):

| Rule | Precision | Recall | F1 |
| :--- | ---: | ---: | ---: |
| **`secure-coding/no-hardcoded-credentials`** (ours) | **100%** | **100%** | **1.00** |
| `eslint-plugin-no-secrets/no-secrets` | 100% | 50% | 0.67 |

The competitor's entropy-only detection catches the high-entropy API-key shape but misses the 15-character literal password assigned to `password:`. Our context-gated detection (structural patterns + credential-named-variable check + context-positive path) catches both for the right reasons.

**On real OSS (vercel/ai), the competitor reports ~380 more findings than us.** Those 380 are not catches we missed — they're entropy false-positives on TypeScript type literals (`'experimental_onLanguageModelCallStart'`), error class names (`'AI_ToolCallNotFoundForApprovalError'`), and documentation URLs. Sampling confirmed zero are actual credentials. The corpus number is the right one to weigh; the OSS finding-count is a noise metric.

## ⚙️ Configuration Presets
| Preset                | Description                                                     |
| :-------------------- | :-------------------------------------------------------------- |
| `recommended`         | 16 core rules — critical issues as `error`, lower-confidence as `warn` |
| `recommended-strict`  | Same 16 rules as `recommended`, all promoted to `error` — for CI gates |
| `strict`              | All rules as `error` — maximum coverage including experimental rules |
| `owasp-top-10`        | OWASP Top 10 Web 2021 compliance focused                        |
| `owasp-mobile-top-10` | OWASP Mobile Top 10 2024 compliance focused                     |

---

## 📦 Compatibility
| Package | Version |
| :--- | :--- |
| ESLint | `^8.40.0 \|\| ^9.0.0 \|\| ^10.0.0` |
| Node.js | `>=18.0.0` |

See the [ESLint Version Support Policy](../../docs/ESLINT_VERSION_SUPPORT.md) — current ecosystem share data, the 20% gate, and the forward-looking exception that covers v10.

## Rules

**Legend**

| Icon | Description |
| :---: | :--- |
| 💼 | **Recommended**: Included in the recommended preset. |
| ⚠️ | **Warns**: Set to warn in recommended preset. |
| 🔧 | **Auto-fixable**: Automatically fixable by the `--fix` CLI option. |
| 💡 | **Suggestions**: Providing code suggestions in IDE. |
| 🚫 | **Deprecated**: This rule is deprecated. |
| 🟢 | **Type-unaware**: AST-only, runs in oxlint JS-plugin tier. |
| 🟡 | **Type-aware (refining)**: pure-AST primary path; types refine precision. |
| 🟠 | **Type-aware (graceful)**: requires TS program; silent without it. |

<!-- AUTO-GENERATED:RULES_TABLE:START - Do not edit manually -->
| Rule | CWE | OWASP | CVSS | Description | 🧠 | 💼 | ⚠️ | 🔧 | 💡 | 🚫 |
| :--- | :---: | :---: | :---: | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| [detect-non-literal-regexp](https://eslint.interlace.tools/docs/security/plugin-secure-coding/rules/detect-non-literal-regexp?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-secure-coding) | CWE-400 |  |  | Detects RegExp(variable), which might allow an attacker to DOS your server with a long-running regular expr… | 🟢 |  |  |  |  |  |
| [detect-object-injection](https://eslint.interlace.tools/docs/security/plugin-secure-coding/rules/detect-object-injection?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-secure-coding) | CWE-915 |  |  | Detects variable[key] as a left- or right-hand assignment operand (prototype pollution) | 🟡 |  |  |  |  |  |
| [detect-weak-password-validation](https://eslint.interlace.tools/docs/security/plugin-secure-coding/rules/detect-weak-password-validation?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-secure-coding) | CWE-521 | A07:2021 |  | Detects weak password length requirements (less than 8 characters) in validation code. | 🟢 |  |  |  |  |  |
| [no-bidi-characters](https://eslint.interlace.tools/docs/security/plugin-secure-coding/rules/no-bidi-characters?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-secure-coding) | CWE-1007 |  |  | Disallows Unicode bidirectional control characters, which let source render differently than it compiles (T… | 🟢 |  |  |  |  |  |
| [no-directive-injection](https://eslint.interlace.tools/docs/security/plugin-secure-coding/rules/no-directive-injection?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-secure-coding) | CWE-94 |  |  | Detects directive injection vulnerabilities in template systems | 🟢 |  |  |  |  |  |
| [no-electron-security-issues](https://eslint.interlace.tools/docs/security/plugin-secure-coding/rules/no-electron-security-issues?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-secure-coding) | CWE-16 |  |  | Detects Electron security vulnerabilities and insecure configurations | 🟢 |  |  |  |  |  |
| [no-fail-open-auth](https://eslint.interlace.tools/docs/security/plugin-secure-coding/rules/no-fail-open-auth?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-secure-coding) | CWE-636 | A10:2025 |  | Detects authentication and authorization checks whose catch block fails open | 🟢 | 💼 |  |  |  |  |
| [no-format-string-injection](https://eslint.interlace.tools/docs/security/plugin-secure-coding/rules/no-format-string-injection?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-secure-coding) | CWE-134 |  |  | Detects format string injection vulnerabilities | 🟢 |  |  |  |  |  |
| [no-graphql-injection](https://eslint.interlace.tools/docs/security/plugin-secure-coding/rules/no-graphql-injection?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-secure-coding) | CWE-943 |  |  | Detects GraphQL injection vulnerabilities and DoS attacks | 🟢 |  | ⚠️ |  |  |  |
| [no-hardcoded-credentials](https://eslint.interlace.tools/docs/security/plugin-secure-coding/rules/no-hardcoded-credentials?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-secure-coding) | CWE-798 |  |  | Detects hardcoded passwords, API keys, tokens, and other sensitive credentials in source code | 🟢 | 💼 |  |  |  |  |
| [no-hardcoded-session-tokens](https://eslint.interlace.tools/docs/security/plugin-secure-coding/rules/no-hardcoded-session-tokens?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-secure-coding) | CWE-798 |  |  | This rule detects hardcoded JWT tokens (starting with eyJ), Bearer tokens, and session identifiers | 🟢 |  |  |  |  |  |
| [no-homoglyph-identifiers](https://eslint.interlace.tools/docs/security/plugin-secure-coding/rules/no-homoglyph-identifiers?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-secure-coding) | CWE-1007 | A08:2021 |  | Detects homoglyph identifiers and invisible characters that hide what the code actually does | 🟢 | 💼 |  |  |  |  |
| [no-improper-sanitization](https://eslint.interlace.tools/docs/security/plugin-secure-coding/rules/no-improper-sanitization?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-secure-coding) | CWE-116 |  |  | Detects improper sanitization of user input | 🟢 | 💼 |  |  |  |  |
| [no-improper-type-validation](https://eslint.interlace.tools/docs/security/plugin-secure-coding/rules/no-improper-type-validation?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-secure-coding) | CWE-1287 |  |  | Detects improper type validation in user input handling | 🟢 |  |  |  |  |  |
| [no-insecure-comparison](https://eslint.interlace.tools/docs/security/plugin-secure-coding/rules/no-insecure-comparison?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-secure-coding) | CWE-697 |  |  | Detects insecure comparison operators (==, !=) that can lead to type coercion vulnerabilities | 🟢 |  |  |  |  |  |
| [no-ldap-injection](https://eslint.interlace.tools/docs/security/plugin-secure-coding/rules/no-ldap-injection?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-secure-coding) | CWE-90 |  |  | Detects LDAP injection vulnerabilities | 🟢 | 💼 |  |  |  |  |
| [no-log-injection](https://eslint.interlace.tools/docs/security/plugin-secure-coding/rules/no-log-injection?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-secure-coding) | CWE-117 | A09:2021 |  | Detects request data concatenated into a log message, which lets an attacker forge log records | 🟢 | 💼 |  |  |  |  |
| [no-missing-authentication](https://eslint.interlace.tools/docs/security/plugin-secure-coding/rules/no-missing-authentication?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-secure-coding) | CWE-287 |  |  | CWE: [CWE-287](https://cwe.mitre.org/data/definitions/287.html) | 🟢 |  |  |  |  |  |
| [no-pii-in-logs](https://eslint.interlace.tools/docs/security/plugin-secure-coding/rules/no-pii-in-logs?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-secure-coding) | CWE-359 |  |  | Prevent personally identifiable information (PII) — emails, SSNs, credit cards, phone numbers — from reachi… | 🟢 |  |  |  | 💡 |  |
| [no-privilege-escalation](https://eslint.interlace.tools/docs/security/plugin-secure-coding/rules/no-privilege-escalation?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-secure-coding) | CWE-269 |  |  | Detects potential privilege escalation vulnerabilities where user input is used to assign roles or permissi… | 🟢 |  | ⚠️ |  |  |  |
| [no-redos-vulnerable-regex](https://eslint.interlace.tools/docs/security/plugin-secure-coding/rules/no-redos-vulnerable-regex?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-secure-coding) | CWE-400 |  |  | ESLint Rule: no-redos-vulnerable-regex | 🟢 | 💼 |  |  |  |  |
| [no-sensitive-data-exposure](https://eslint.interlace.tools/docs/security/plugin-secure-coding/rules/no-sensitive-data-exposure?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-secure-coding) | CWE-532 |  |  | ESLint Rule: no-sensitive-data-exposure | 🟢 |  | ⚠️ |  |  |  |
| [no-sql-injection](https://eslint.interlace.tools/docs/security/plugin-secure-coding/rules/no-sql-injection?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-secure-coding) | CWE-89 | A03:2021 |  | Detects SQL statements built from attacker-controlled input in files that import no SQL driver | 🟢 | 💼 |  |  |  |  |
| [no-template-injection](https://eslint.interlace.tools/docs/security/plugin-secure-coding/rules/no-template-injection?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-secure-coding) | CWE-94 | A03:2021 |  | Disallow dynamic strings as template arguments to server-side template engines (CWE-94) | 🟢 | 💼 |  |  |  |  |
| [no-unchecked-loop-condition](https://eslint.interlace.tools/docs/security/plugin-secure-coding/rules/no-unchecked-loop-condition?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-secure-coding) | CWE-400 |  |  | Detects unchecked loop conditions that could cause DoS | 🟢 |  |  |  |  |  |
| [no-unlimited-resource-allocation](https://eslint.interlace.tools/docs/security/plugin-secure-coding/rules/no-unlimited-resource-allocation?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-secure-coding) | CWE-770 |  |  | Detects unlimited resource allocation that could cause DoS | 🟢 |  | ⚠️ |  |  |  |
| [no-unsafe-deserialization](https://eslint.interlace.tools/docs/security/plugin-secure-coding/rules/no-unsafe-deserialization?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-secure-coding) | CWE-502 |  |  | Detects unsafe deserialization of untrusted data | 🟢 |  | ⚠️ |  |  |  |
| [no-unsafe-regex-construction](https://eslint.interlace.tools/docs/security/plugin-secure-coding/rules/no-unsafe-regex-construction?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-secure-coding) | CWE-400 |  |  | ESLint Rule: no-unsafe-regex-construction with LLM-optimized suggestions and auto-fix capabilities | 🟢 | 💼 |  |  |  |  |
| [no-weak-password-recovery](https://eslint.interlace.tools/docs/security/plugin-secure-coding/rules/no-weak-password-recovery?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-secure-coding) | CWE-640 |  |  | ESLint Rule: no-weak-password-recovery with LLM-optimized suggestions and auto-fix capabilities | 🟢 |  | ⚠️ |  |  |  |
| [no-xpath-injection](https://eslint.interlace.tools/docs/security/plugin-secure-coding/rules/no-xpath-injection?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-secure-coding) | CWE-643 |  |  | Detects XPath injection vulnerabilities | 🟢 | 💼 |  |  |  |  |
| [no-xxe-injection](https://eslint.interlace.tools/docs/security/plugin-secure-coding/rules/no-xxe-injection?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-secure-coding) | CWE-611 |  |  | Detects XML External Entity (XXE) injection vulnerabilities | 🟢 | 💼 |  |  |  |  |
| [require-backend-authorization](https://eslint.interlace.tools/docs/security/plugin-secure-coding/rules/require-backend-authorization?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-secure-coding) | CWE-602 |  |  | CWE: [CWE-602](https://cwe.mitre.org/data/definitions/602.html) | 🟢 |  |  |  |  |  |
| [require-secure-defaults](https://eslint.interlace.tools/docs/security/plugin-secure-coding/rules/require-secure-defaults?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-secure-coding) | CWE-1188 |  |  | CWE: [CWE-1188](https://cwe.mitre.org/data/definitions/1188.html) | 🟢 |  |  |  |  |  |
<!-- AUTO-GENERATED:RULES_TABLE:END -->
<!-- AUTO-GENERATED:ECOSYSTEM_TABLE:START - Do not edit manually -->

## 🔗 Related ESLint Plugins

Part of the **Interlace ESLint ecosystem** — AI-native rules with LLM-optimized error messages:

**Security**

| Plugin | Downloads | Description |
| :--- | :---: | :--- |
| [`eslint-plugin-anthropic-security`](https://www.npmjs.com/package/eslint-plugin-anthropic-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-anthropic-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-anthropic-security) | Anthropic SDK security. |
| [`eslint-plugin-browser-security`](https://www.npmjs.com/package/eslint-plugin-browser-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-browser-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-browser-security) | XSS, DOM security. |
| [`eslint-plugin-drizzle-security`](https://www.npmjs.com/package/eslint-plugin-drizzle-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-drizzle-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-drizzle-security) | Drizzle security. |
| [`eslint-plugin-express-security`](https://www.npmjs.com/package/eslint-plugin-express-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-express-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-express-security) | Express middleware hardening. |
| [`eslint-plugin-gemini-security`](https://www.npmjs.com/package/eslint-plugin-gemini-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-gemini-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-gemini-security) | Google Gemini SDK security. |
| [`eslint-plugin-jwt-security`](https://www.npmjs.com/package/eslint-plugin-jwt-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-jwt-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-jwt-security) | Token security. |
| [`eslint-plugin-knex-security`](https://www.npmjs.com/package/eslint-plugin-knex-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-knex-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-knex-security) | Knex security. |
| [`eslint-plugin-lambda-security`](https://www.npmjs.com/package/eslint-plugin-lambda-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-lambda-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-lambda-security) | AWS Lambda hardening. |
| [`eslint-plugin-mcp-sdk-security`](https://www.npmjs.com/package/eslint-plugin-mcp-sdk-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-mcp-sdk-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-mcp-sdk-security) | MCP SDK security. |
| [`eslint-plugin-mongodb-security`](https://www.npmjs.com/package/eslint-plugin-mongodb-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-mongodb-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-mongodb-security) | MongoDB injection. |
| [`eslint-plugin-mysql-security`](https://www.npmjs.com/package/eslint-plugin-mysql-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-mysql-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-mysql-security) | MySQL security. |
| [`eslint-plugin-nestjs-security`](https://www.npmjs.com/package/eslint-plugin-nestjs-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-nestjs-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-nestjs-security) | NestJS framework hardening. |
| [`eslint-plugin-node-security`](https://www.npmjs.com/package/eslint-plugin-node-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-node-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-node-security) | Server-side patterns. |
| [`eslint-plugin-openai-security`](https://www.npmjs.com/package/eslint-plugin-openai-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-openai-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-openai-security) | OpenAI SDK security. |
| [`eslint-plugin-postgresql-security`](https://www.npmjs.com/package/eslint-plugin-postgresql-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-postgresql-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-postgresql-security) | PostgreSQL security. |
| [`eslint-plugin-prisma-security`](https://www.npmjs.com/package/eslint-plugin-prisma-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-prisma-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-prisma-security) | Prisma security. |
| [`eslint-plugin-sequelize-security`](https://www.npmjs.com/package/eslint-plugin-sequelize-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-sequelize-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-sequelize-security) | Sequelize ORM security. |
| [`eslint-plugin-sqlite-security`](https://www.npmjs.com/package/eslint-plugin-sqlite-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-sqlite-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-sqlite-security) | SQLite security. |
| [`eslint-plugin-typeorm-security`](https://www.npmjs.com/package/eslint-plugin-typeorm-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-typeorm-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-typeorm-security) | TypeORM security. |
| [`eslint-plugin-vercel-ai-security`](https://www.npmjs.com/package/eslint-plugin-vercel-ai-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-vercel-ai-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-vercel-ai-security) | AI SDK security. |

**Code quality**

| Plugin | Downloads | Description |
| :--- | :---: | :--- |
| [`eslint-plugin-conventions`](https://www.npmjs.com/package/eslint-plugin-conventions) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-conventions.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-conventions) | Team-specific habits and styles. |
| [`eslint-plugin-import-next`](https://www.npmjs.com/package/eslint-plugin-import-next) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-import-next.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-import-next) | Fast cycle + import-graph analysis. |
| [`eslint-plugin-maintainability`](https://www.npmjs.com/package/eslint-plugin-maintainability) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-maintainability.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-maintainability) | Cognitive load and clean-code patterns. |
| [`eslint-plugin-modernization`](https://www.npmjs.com/package/eslint-plugin-modernization) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-modernization.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-modernization) | ESNext migration + syntax evolution. |
| [`eslint-plugin-modularity`](https://www.npmjs.com/package/eslint-plugin-modularity) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-modularity.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-modularity) | Structural integrity and DDD patterns. |
| [`eslint-plugin-operability`](https://www.npmjs.com/package/eslint-plugin-operability) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-operability.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-operability) | Production readiness and resource health. |
| [`eslint-plugin-react-a11y`](https://www.npmjs.com/package/eslint-plugin-react-a11y) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-react-a11y.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-react-a11y) | React accessibility / WCAG. |
| [`eslint-plugin-react-features`](https://www.npmjs.com/package/eslint-plugin-react-features) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-react-features.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-react-features) | React best practices and optimization. |
| [`eslint-plugin-reliability`](https://www.npmjs.com/package/eslint-plugin-reliability) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-reliability.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-reliability) | Runtime stability and error safety. |

<!-- AUTO-GENERATED:ECOSYSTEM_TABLE:END -->

<!-- INTERLACE:STAR_CTA:START -->
## ⭐ Support & follow

If this plugin caught a real bug for you, **[star the repo](https://github.com/ofri-peretz/eslint)** — stars are the signal that keeps the Interlace ESLint ecosystem maintained — and **[follow the writeups on Dev.to](https://dev.to/ofri-peretz)** for the benchmarks and security research behind these rules.

[![GitHub stars](https://img.shields.io/github/stars/ofri-peretz/eslint?style=social)](https://github.com/ofri-peretz/eslint)

<!-- INTERLACE:STAR_CTA:END -->

## 📄 License

MIT © [Ofri Peretz](https://github.com/ofri-peretz)

<p align="center">
  <a href="https://eslint.interlace.tools/docs/security/plugin-secure-coding?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-secure-coding"><img src="https://eslint.interlace.tools/images/og-secure-coding.png" alt="ESLint Interlace Plugin" width="100%" /></a>
</p>

<p align="center">
  <a href="https://eslint.interlace.tools/?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-secure-coding" target="blank"><picture><source media="(prefers-color-scheme: dark)" srcset="https://eslint.interlace.tools/logos/interlace-dark.svg"><img src="https://eslint.interlace.tools/logos/interlace-light.svg" alt="Interlace" height="70" /></picture></a>
</p>
