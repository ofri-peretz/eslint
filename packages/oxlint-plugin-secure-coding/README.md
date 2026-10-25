<p align="center">
  <a href="https://eslint.interlace.tools/docs/security/plugin-secure-coding?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-secure-coding" target="blank"><picture><source media="(prefers-color-scheme: dark)" srcset="https://eslint.interlace.tools/logos/interlace-dark.svg"><img src="https://eslint.interlace.tools/logos/interlace-light.svg" alt="Interlace" height="90" /></picture></a>
  &nbsp;&nbsp;
  <a href="https://oxc.rs" target="_blank"><picture><source media="(prefers-color-scheme: dark)" srcset="https://eslint.interlace.tools/logos/oxlint-dark.svg"><img src="https://eslint.interlace.tools/logos/oxlint-light.svg" alt="oxlint" height="90" /></picture></a>
</p>

<p align="center">
  General secure coding practices and OWASP compliance for JavaScript/TypeScript.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/oxlint-plugin-secure-coding" target="_blank"><img src="https://img.shields.io/npm/v/oxlint-plugin-secure-coding.svg" alt="NPM Version" /></a>
  <a href="https://www.npmjs.com/package/oxlint-plugin-secure-coding" target="_blank"><img src="https://img.shields.io/npm/dm/oxlint-plugin-secure-coding.svg" alt="NPM Downloads" /></a>
  <a href="https://packagephobia.com/result?p=oxlint-plugin-secure-coding" target="_blank"><img src="https://badgen.net/packagephobia/install/oxlint-plugin-secure-coding" alt="Install Size" /></a>
  <a href="https://opensource.org/licenses/MIT" target="_blank"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="Package License" /></a>
  <a href="https://app.codecov.io/gh/ofri-peretz/eslint/components?components%5B0%5D=eslint-plugin-secure-coding" target="_blank"><img src="https://codecov.io/gh/ofri-peretz/eslint/graph/badge.svg?component=eslint-plugin-secure-coding" alt="Codecov" /></a>
  <a href="https://github.com/ofri-peretz/eslint" target="_blank"><img src="https://img.shields.io/badge/Since-Dec_2025-blue?logo=rocket&logoColor=white" alt="Since Dec 2025" /></a>
  <a href="https://scorecard.dev/viewer/?uri=github.com/ofri-peretz/eslint" target="_blank"><img src="https://api.securityscorecards.dev/projects/github.com/ofri-peretz/eslint/badge" alt="OpenSSF Scorecard" /></a>
</p>

> ⭐ If this plugin caught a real bug for you, [**star the repo**](https://github.com/ofri-peretz/eslint) — it's the signal that keeps these rules maintained.

## Description

`oxlint-plugin-secure-coding` is the [oxlint](https://oxc.rs/docs/guide/usage/linter/js-plugins) and [Vite+](https://viteplus.dev/guide/lint) name for [`eslint-plugin-secure-coding`](https://www.npmjs.com/package/eslint-plugin-secure-coding). It carries the same rules under the same IDs (`secure-coding/<rule>`), always at the same version, because it re-exports that package rather than copying it. Installing it does not install ESLint.

## Covered natively by oxlint

None of these 33 rules has an oxlint built-in equivalent. Every rule here is new to oxlint.

- **Why** — a linter nobody reads protects nothing. We would rather miss a finding
  than spend your attention on one that was never real.
- **How** — evidence, not names. A rule fires on what the code _does_, resolved
  through the AST and ESLint's own scope analysis.
- **What** — every finding carries its fix, in prose for a human and as structured
  JSON for an agent. Security rules add a CWE mapping and, where assigned, a CVSS score.

That trade costs recall, and we measure it:
[methodology](https://github.com/ofri-peretz/eslint/blob/main/BENCHMARK-METHODOLOGY.md)
· [results](https://github.com/ofri-peretz/eslint/blob/main/BENCHMARK-RESULTS.md)
· [a false positive is a bug](https://github.com/ofri-peretz/eslint/issues).

## Getting Started

```bash
npm install oxlint-plugin-secure-coding --save-dev
```

### Vite+

```ts
// vite.config.ts
import { defineConfig } from 'vite-plus';

export default defineConfig({
  lint: {
    jsPlugins: ['oxlint-plugin-secure-coding'],
    rules: {
      'secure-coding/no-fail-open-auth': 'error',
      'secure-coding/no-hardcoded-credentials': 'error',
      'secure-coding/no-homoglyph-identifiers': 'error',
      'secure-coding/no-improper-sanitization': 'error',
      'secure-coding/no-ldap-injection': 'error',
      'secure-coding/no-log-injection': 'error',
      'secure-coding/no-redos-vulnerable-regex': 'error',
      'secure-coding/no-sql-injection': 'error',
      'secure-coding/no-template-injection': 'error',
      'secure-coding/no-unsafe-regex-construction': 'error',
      'secure-coding/no-xpath-injection': 'error',
      'secure-coding/no-xxe-injection': 'error',
    },
  },
});
```

### oxlint

```json
{
  "jsPlugins": ["oxlint-plugin-secure-coding"],
  "rules": {
    "secure-coding/no-fail-open-auth": "error",
    "secure-coding/no-hardcoded-credentials": "error",
    "secure-coding/no-homoglyph-identifiers": "error",
    "secure-coding/no-improper-sanitization": "error",
    "secure-coding/no-ldap-injection": "error",
    "secure-coding/no-log-injection": "error",
    "secure-coding/no-redos-vulnerable-regex": "error",
    "secure-coding/no-sql-injection": "error",
    "secure-coding/no-template-injection": "error",
    "secure-coding/no-unsafe-regex-construction": "error",
    "secure-coding/no-xpath-injection": "error",
    "secure-coding/no-xxe-injection": "error"
  }
}
```

These are the rules the plugin recommends (💼 in the table below).

### ESLint

Install [`eslint-plugin-secure-coding`](https://www.npmjs.com/package/eslint-plugin-secure-coding) instead. It has the same rules, plus presets for ESLint's flat config.

## 📦 Compatibility

| Package | Version                                                          |
| :------ | :--------------------------------------------------------------- |
| oxlint  | verified on `1.88.0`: CI loads every rule ID through `jsPlugins` |
| Vite+   | `lint.jsPlugins` in `vite.config.ts`                             |
| Node.js | `>=18.0.0`                                                       |

## Rules

**Legend**

| Icon | Description                                                               |
| :--: | :------------------------------------------------------------------------ |
|  💼  | **Recommended**: Included in the recommended preset.                      |
|  ⚠️  | **Warns**: Set to warn in recommended preset.                             |
|  🔧  | **Auto-fixable**: Automatically fixable by the `--fix` CLI option.        |
|  💡  | **Suggestions**: Providing code suggestions in IDE.                       |
|  🚫  | **Deprecated**: This rule is deprecated.                                  |
|  🟢  | **Type-unaware**: AST-only, runs in oxlint JS-plugin tier.                |
|  🟡  | **Type-aware (refining)**: pure-AST primary path; types refine precision. |
|  🟠  | **Type-aware (graceful)**: requires TS program; silent without it.        |

| Rule                                                                                                                                                                                                                        |   CWE    |  OWASP   | CVSS | Description                                                                                                  | 🧠  | 💼  | ⚠️  | 🔧  | 💡  | 🚫  |
| :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------: | :------: | :--: | :----------------------------------------------------------------------------------------------------------- | :-: | :-: | :-: | :-: | :-: | :-: |
| [detect-non-literal-regexp](https://eslint.interlace.tools/docs/security/plugin-secure-coding/rules/detect-non-literal-regexp?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-secure-coding)               | CWE-400  |          |      | Detects RegExp(variable), which might allow an attacker to DOS your server with a long-running regular expr… | 🟢  |     |     |     |     |     |
| [detect-object-injection](https://eslint.interlace.tools/docs/security/plugin-secure-coding/rules/detect-object-injection?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-secure-coding)                   | CWE-915  |          |      | Detects variable[key] as a left- or right-hand assignment operand (prototype pollution)                      | 🟡  |     |     |     |     |     |
| [detect-weak-password-validation](https://eslint.interlace.tools/docs/security/plugin-secure-coding/rules/detect-weak-password-validation?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-secure-coding)   | CWE-521  | A07:2021 |      | Detects weak password length requirements (less than 8 characters) in validation code.                       | 🟢  |     |     |     |     |     |
| [no-bidi-characters](https://eslint.interlace.tools/docs/security/plugin-secure-coding/rules/no-bidi-characters?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-secure-coding)                             | CWE-1007 |          |      | Disallows Unicode bidirectional control characters, which let source render differently than it compiles (T… | 🟢  |     |     |     |     |     |
| [no-directive-injection](https://eslint.interlace.tools/docs/security/plugin-secure-coding/rules/no-directive-injection?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-secure-coding)                     |  CWE-94  |          |      | Detects directive injection vulnerabilities in template systems                                              | 🟢  |     |     |     |     |     |
| [no-electron-security-issues](https://eslint.interlace.tools/docs/security/plugin-secure-coding/rules/no-electron-security-issues?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-secure-coding)           |  CWE-16  |          |      | Detects Electron security vulnerabilities and insecure configurations                                        | 🟢  |     |     |     |     |     |
| [no-fail-open-auth](https://eslint.interlace.tools/docs/security/plugin-secure-coding/rules/no-fail-open-auth?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-secure-coding)                               | CWE-636  | A10:2025 |      | Detects authentication and authorization checks whose catch block fails open                                 | 🟢  | 💼  |     |     |     |     |
| [no-format-string-injection](https://eslint.interlace.tools/docs/security/plugin-secure-coding/rules/no-format-string-injection?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-secure-coding)             | CWE-134  |          |      | Detects format string injection vulnerabilities                                                              | 🟢  |     |     |     |     |     |
| [no-graphql-injection](https://eslint.interlace.tools/docs/security/plugin-secure-coding/rules/no-graphql-injection?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-secure-coding)                         | CWE-943  |          |      | Detects GraphQL injection vulnerabilities and DoS attacks                                                    | 🟢  |     | ⚠️  |     |     |     |
| [no-hardcoded-credentials](https://eslint.interlace.tools/docs/security/plugin-secure-coding/rules/no-hardcoded-credentials?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-secure-coding)                 | CWE-798  |          |      | Detects hardcoded passwords, API keys, tokens, and other sensitive credentials in source code                | 🟢  | 💼  |     |     |     |     |
| [no-hardcoded-session-tokens](https://eslint.interlace.tools/docs/security/plugin-secure-coding/rules/no-hardcoded-session-tokens?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-secure-coding)           | CWE-798  |          |      | This rule detects hardcoded JWT tokens (starting with eyJ), Bearer tokens, and session identifiers           | 🟢  |     |     |     |     |     |
| [no-homoglyph-identifiers](https://eslint.interlace.tools/docs/security/plugin-secure-coding/rules/no-homoglyph-identifiers?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-secure-coding)                 | CWE-1007 | A08:2021 |      | Detects homoglyph identifiers and invisible characters that hide what the code actually does                 | 🟢  | 💼  |     |     |     |     |
| [no-improper-sanitization](https://eslint.interlace.tools/docs/security/plugin-secure-coding/rules/no-improper-sanitization?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-secure-coding)                 | CWE-116  |          |      | Detects improper sanitization of user input                                                                  | 🟢  | 💼  |     |     |     |     |
| [no-improper-type-validation](https://eslint.interlace.tools/docs/security/plugin-secure-coding/rules/no-improper-type-validation?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-secure-coding)           | CWE-1287 |          |      | Detects improper type validation in user input handling                                                      | 🟢  |     |     |     |     |     |
| [no-insecure-comparison](https://eslint.interlace.tools/docs/security/plugin-secure-coding/rules/no-insecure-comparison?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-secure-coding)                     | CWE-697  |          |      | Detects insecure comparison operators (==, !=) that can lead to type coercion vulnerabilities                | 🟢  |     |     |     |     |     |
| [no-ldap-injection](https://eslint.interlace.tools/docs/security/plugin-secure-coding/rules/no-ldap-injection?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-secure-coding)                               |  CWE-90  |          |      | Detects LDAP injection vulnerabilities                                                                       | 🟢  | 💼  |     |     |     |     |
| [no-log-injection](https://eslint.interlace.tools/docs/security/plugin-secure-coding/rules/no-log-injection?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-secure-coding)                                 | CWE-117  | A09:2021 |      | Detects request data concatenated into a log message, which lets an attacker forge log records               | 🟢  | 💼  |     |     |     |     |
| [no-missing-authentication](https://eslint.interlace.tools/docs/security/plugin-secure-coding/rules/no-missing-authentication?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-secure-coding)               | CWE-287  |          |      | CWE: [CWE-287](https://cwe.mitre.org/data/definitions/287.html)                                              | 🟢  |     |     |     |     |     |
| [no-pii-in-logs](https://eslint.interlace.tools/docs/security/plugin-secure-coding/rules/no-pii-in-logs?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-secure-coding)                                     | CWE-359  |          |      | Prevent personally identifiable information (PII) — emails, SSNs, credit cards, phone numbers — from reachi… | 🟢  |     |     |     | 💡  |     |
| [no-privilege-escalation](https://eslint.interlace.tools/docs/security/plugin-secure-coding/rules/no-privilege-escalation?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-secure-coding)                   | CWE-269  |          |      | Detects potential privilege escalation vulnerabilities where user input is used to assign roles or permissi… | 🟢  |     | ⚠️  |     |     |     |
| [no-redos-vulnerable-regex](https://eslint.interlace.tools/docs/security/plugin-secure-coding/rules/no-redos-vulnerable-regex?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-secure-coding)               | CWE-400  |          |      | ESLint Rule: no-redos-vulnerable-regex                                                                       | 🟢  | 💼  |     |     |     |     |
| [no-sensitive-data-exposure](https://eslint.interlace.tools/docs/security/plugin-secure-coding/rules/no-sensitive-data-exposure?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-secure-coding)             | CWE-532  |          |      | ESLint Rule: no-sensitive-data-exposure                                                                      | 🟢  |     | ⚠️  |     |     |     |
| [no-sql-injection](https://eslint.interlace.tools/docs/security/plugin-secure-coding/rules/no-sql-injection?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-secure-coding)                                 |  CWE-89  | A03:2021 |      | Detects SQL statements built from attacker-controlled input in files that import no SQL driver               | 🟢  | 💼  |     |     |     |     |
| [no-template-injection](https://eslint.interlace.tools/docs/security/plugin-secure-coding/rules/no-template-injection?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-secure-coding)                       |  CWE-94  | A03:2021 |      | Disallow dynamic strings as template arguments to server-side template engines (CWE-94)                      | 🟢  | 💼  |     |     |     |     |
| [no-unchecked-loop-condition](https://eslint.interlace.tools/docs/security/plugin-secure-coding/rules/no-unchecked-loop-condition?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-secure-coding)           | CWE-400  |          |      | Detects unchecked loop conditions that could cause DoS                                                       | 🟢  |     |     |     |     |     |
| [no-unlimited-resource-allocation](https://eslint.interlace.tools/docs/security/plugin-secure-coding/rules/no-unlimited-resource-allocation?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-secure-coding) | CWE-770  |          |      | Detects unlimited resource allocation that could cause DoS                                                   | 🟢  |     | ⚠️  |     |     |     |
| [no-unsafe-deserialization](https://eslint.interlace.tools/docs/security/plugin-secure-coding/rules/no-unsafe-deserialization?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-secure-coding)               | CWE-502  |          |      | Detects unsafe deserialization of untrusted data                                                             | 🟢  |     | ⚠️  |     |     |     |
| [no-unsafe-regex-construction](https://eslint.interlace.tools/docs/security/plugin-secure-coding/rules/no-unsafe-regex-construction?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-secure-coding)         | CWE-400  |          |      | ESLint Rule: no-unsafe-regex-construction with LLM-optimized suggestions and auto-fix capabilities           | 🟢  | 💼  |     |     |     |     |
| [no-weak-password-recovery](https://eslint.interlace.tools/docs/security/plugin-secure-coding/rules/no-weak-password-recovery?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-secure-coding)               | CWE-640  |          |      | ESLint Rule: no-weak-password-recovery with LLM-optimized suggestions and auto-fix capabilities              | 🟢  |     | ⚠️  |     |     |     |
| [no-xpath-injection](https://eslint.interlace.tools/docs/security/plugin-secure-coding/rules/no-xpath-injection?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-secure-coding)                             | CWE-643  |          |      | Detects XPath injection vulnerabilities                                                                      | 🟢  | 💼  |     |     |     |     |
| [no-xxe-injection](https://eslint.interlace.tools/docs/security/plugin-secure-coding/rules/no-xxe-injection?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-secure-coding)                                 | CWE-611  |          |      | Detects XML External Entity (XXE) injection vulnerabilities                                                  | 🟢  | 💼  |     |     |     |     |
| [require-backend-authorization](https://eslint.interlace.tools/docs/security/plugin-secure-coding/rules/require-backend-authorization?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-secure-coding)       | CWE-602  |          |      | CWE: [CWE-602](https://cwe.mitre.org/data/definitions/602.html)                                              | 🟢  |     |     |     |     |     |
| [require-secure-defaults](https://eslint.interlace.tools/docs/security/plugin-secure-coding/rules/require-secure-defaults?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-secure-coding)                   | CWE-1188 |          |      | CWE: [CWE-1188](https://cwe.mitre.org/data/definitions/1188.html)                                            | 🟢  |     |     |     |     |     |

## ⭐ Support & follow

If this plugin caught a real bug for you, **[star the repo](https://github.com/ofri-peretz/eslint)** — stars are the signal that keeps the Interlace ESLint ecosystem maintained — and **[follow the writeups on Dev.to](https://dev.to/ofri-peretz)** for the benchmarks and security research behind these rules.

[![GitHub stars](https://img.shields.io/github/stars/ofri-peretz/eslint?style=social)](https://github.com/ofri-peretz/eslint)

## 📄 License

MIT © [Ofri Peretz](https://github.com/ofri-peretz)

<p align="center">
  <a href="https://eslint.interlace.tools/docs/security/plugin-secure-coding?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-secure-coding"><img src="https://eslint.interlace.tools/images/og-secure-coding.png" alt="ESLint Interlace Plugin" width="100%" /></a>
</p>

<p align="center">
  <a href="https://eslint.interlace.tools/docs/security/plugin-secure-coding?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-secure-coding" target="blank"><picture><source media="(prefers-color-scheme: dark)" srcset="https://eslint.interlace.tools/logos/interlace-dark.svg"><img src="https://eslint.interlace.tools/logos/interlace-light.svg" alt="Interlace" height="70" /></picture></a>
</p>
