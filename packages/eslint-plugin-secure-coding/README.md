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
  <a href="https://github.com/ofri-peretz/eslint" target="_blank"><img src="https://img.shields.io/badge/Since-Dec_2025-blue?logo=rocket&logoColor=white" alt="Since Dec 2025" /></a>
</p>

## Description

This plugin provides a comprehensive set of security rules for JavaScript and TypeScript, ensuring alignment with OWASP compliance standards. It covers a wide range of vulnerabilities, from injection attacks to insecure data handling, offering a solid foundation for secure application development. By using this plugin, you can proactively identify and mitigate security risks across your entire codebase.

## Philosophy

**Interlace** fosters **strength through integration**. Instead of stacking isolated rules, we **interlace** security directly into your workflow to create a resilient fabric of code. We believe tools should **guide rather than gatekeep**, providing educational feedback that strengthens the developer with every interaction.

## Getting Started

- To check out the [guide](https://eslint.interlace.tools/docs/secure-coding), visit [eslint.interlace.tools](https://eslint.interlace.tools). 📚
- 要查看中文 [指南](https://eslint.interlace.tools/docs/secure-coding), 请访问 [eslint.interlace.tools](https://eslint.interlace.tools). 📚
- [가이드](https://eslint.interlace.tools/docs/secure-coding) 문서는 [eslint.interlace.tools](https://eslint.interlace.tools)에서 확인하실 수 있습니다. 📚
- [ガイド](https://eslint.interlace.tools/docs/secure-coding)は [eslint.interlace.tools](https://eslint.interlace.tools)でご確認ください。 📚
- Para ver la [guía](https://eslint.interlace.tools/docs/secure-coding), visita [eslint.interlace.tools](https://eslint.interlace.tools). 📚
- للاطلاع على [الدليل](https://eslint.interlace.tools/docs/secure-coding)، قم بزيارة [eslint.interlace.tools](https://eslint.interlace.tools). 📚

```bash
npm install eslint-plugin-secure-coding --save-dev
```

## ⚙️ Configuration Presets

| Preset                | Description                                                     |
| :-------------------- | :-------------------------------------------------------------- |
| `recommended`         | Balanced security for most projects (Web + key Mobile security) |
| `strict`              | Maximum security enforcement (all rules as errors)              |
| `owasp-top-10`        | OWASP Top 10 Web 2021 compliance focused                        |
| `owasp-mobile-top-10` | OWASP Mobile Top 10 2024 compliance focused                     |

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

## AI-Optimized Messages

This plugin is optimized for ESLint's [Model Context Protocol (MCP)](https://eslint.org/docs/latest/use/mcp), enabling AI assistants like **Cursor**, **GitHub Copilot**, and **Claude** to:

- Understand the exact vulnerability type via CWE references
- Apply the correct fix using structured guidance
- Provide educational context to developers

```bash
src/api.ts
  42:15  error  🔒 CWE-89 OWASP:A03-Injection CVSS:9.8 | SQL Injection detected | CRITICAL [SOC2,PCI-DSS,HIPAA]
                    Fix: Use parameterized query: db.query("SELECT * FROM users WHERE id = ?", [userId]) | https://owasp.org/...
```

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

By providing this structured context (CWE, OWASP, Fix), we enable AI tools to **reason** about the security flaw rather than hallucinating. This allows Copilot/Cursor to suggest the _exact_ correct fix immediately.

---

## 🔒 Privacy

This plugin runs **100% locally**. No data ever leaves your machine.

---

**Q: Does it work with ESLint 9 flat config?**
A: Yes, fully compatible.

## Rules

**Legend**

| Icon | Description                                                        |
| :--: | :----------------------------------------------------------------- |
|  💼  | **Recommended**: Included in the recommended preset.               |
|  ⚠️  | **Warns**: Set towarn in recommended preset.                       |
|  🔧  | **Auto-fixable**: Automatically fixable by the `--fix` CLI option. |
|  💡  | **Suggestions**: Providing code suggestions in IDE.                |
|  🚫  | **Deprecated**: This rule is deprecated.                           |

| Rule                                                                                                                                     |   CWE    | OWASP | CVSS | Description                                                                                      | 💼  | ⚠️  | 🔧  | 💡  | 🚫  |
| :--------------------------------------------------------------------------------------------------------------------------------------- | :------: | :---: | :--: | :----------------------------------------------------------------------------------------------- | :-: | :-: | :-: | :-: | :-: |
| [no-sql-injection](https://eslint.interlace.tools/docs/secure-coding/rules/no-sql-injection)                                             |  CWE-89  |       | 9.8  | [no-sql-injection](./docs/rules/no-sql-injection.md)                                             | 💼  |     |     |     |     |
| [database-injection](https://eslint.interlace.tools/docs/secure-coding/rules/database-injection)                                         |  CWE-89  |       | 9.8  | [database-injection](./docs/rules/database-injection.md)                                         | 💼  |     |     |     |     |
| [detect-eval-with-expression](https://eslint.interlace.tools/docs/secure-coding/rules/detect-eval-with-expression)                       |  CWE-95  |       | 9.8  | [detect-eval-with-expression](./docs/rules/detect-eval-with-expression.md)                       | 💼  |     |     |     |     |
| [detect-child-process](https://eslint.interlace.tools/docs/secure-coding/rules/detect-child-process)                                     |  CWE-78  |       | 9.8  | [detect-child-process](./docs/rules/detect-child-process.md)                                     | 💼  |     |     |     |     |
| [no-unsafe-dynamic-require](https://eslint.interlace.tools/docs/secure-coding/rules/no-unsafe-dynamic-require)                           |  CWE-95  |       | 7.5  | [no-unsafe-dynamic-require](./docs/rules/no-unsafe-dynamic-require.md)                           | 💼  |     |     |     |     |
| [no-graphql-injection](https://eslint.interlace.tools/docs/secure-coding/rules/no-graphql-injection)                                     | CWE-943  |       | 8.6  | [no-graphql-injection](./docs/rules/no-graphql-injection.md)                                     | 💼  |     |     |     |     |
| [no-xxe-injection](https://eslint.interlace.tools/docs/secure-coding/rules/no-xxe-injection)                                             | CWE-611  |       | 9.1  | [no-xxe-injection](./docs/rules/no-xxe-injection.md)                                             | 💼  |     |     |     |     |
| [no-xpath-injection](https://eslint.interlace.tools/docs/secure-coding/rules/no-xpath-injection)                                         | CWE-643  |       | 9.8  | [no-xpath-injection](./docs/rules/no-xpath-injection.md)                                         | 💼  |     |     |     |     |
| [no-ldap-injection](https://eslint.interlace.tools/docs/secure-coding/rules/no-ldap-injection)                                           |  CWE-90  |       | 9.8  | [no-ldap-injection](./docs/rules/no-ldap-injection.md)                                           | 💼  |     |     |     |     |
| [no-directive-injection](https://eslint.interlace.tools/docs/secure-coding/rules/no-directive-injection)                                 |  CWE-94  |       | 8.8  | [no-directive-injection](./docs/rules/no-directive-injection.md)                                 | 💼  |     |     |     |     |
| [no-format-string-injection](https://eslint.interlace.tools/docs/secure-coding/rules/no-format-string-injection)                         | CWE-134  |       | 9.8  | [no-format-string-injection](./docs/rules/no-format-string-injection.md)                         | 💼  |     |     |     |     |
| [no-http-urls](https://eslint.interlace.tools/docs/secure-coding/rules/no-http-urls)                                                     | CWE-319  |       | 7.5  | [no-http-urls](./docs/rules/no-http-urls.md)                                                     | 💼  |     |     |     |     |
| [no-hardcoded-credentials](https://eslint.interlace.tools/docs/secure-coding/rules/no-hardcoded-credentials)                             | CWE-798  |       | 7.5  | [no-hardcoded-credentials](./docs/rules/no-hardcoded-credentials.md)                             | 💼  |     | 🔧  | 💡  |     |
| [no-credentials-in-storage-api](https://eslint.interlace.tools/docs/secure-coding/rules/no-credentials-in-storage-api)                   | CWE-522  |       | 7.5  | [no-credentials-in-storage-api](./docs/rules/no-credentials-in-storage-api.md)                   | 💼  |     |     |     |     |
| [no-credentials-in-query-params](https://eslint.interlace.tools/docs/secure-coding/rules/no-credentials-in-query-params)                 | CWE-598  |       | 7.5  | [no-credentials-in-query-params](./docs/rules/no-credentials-in-query-params.md)                 | 💼  |     |     |     |     |
| [no-allow-arbitrary-loads](https://eslint.interlace.tools/docs/secure-coding/rules/no-allow-arbitrary-loads)                             | CWE-295  |       | 7.5  | [no-allow-arbitrary-loads](./docs/rules/no-allow-arbitrary-loads.md)                             |     |     |     |     |     |
| [no-disabled-certificate-validation](https://eslint.interlace.tools/docs/secure-coding/rules/no-disabled-certificate-validation)         | CWE-295  |       | 7.5  | [no-disabled-certificate-validation](./docs/rules/no-disabled-certificate-validation.md)         |     |     |     |     |     |
| [require-https-only](https://eslint.interlace.tools/docs/secure-coding/rules/require-https-only)                                         | CWE-319  |       | 7.5  | [require-https-only](./docs/rules/require-https-only.md)                                         | 💼  |     |     |     |     |
| [require-network-timeout](https://eslint.interlace.tools/docs/secure-coding/rules/require-network-timeout)                               | CWE-400  |       | 7.5  | [require-network-timeout](./docs/rules/require-network-timeout.md)                               |     |     |     |     |     |
| [detect-weak-password-validation](https://eslint.interlace.tools/docs/secure-coding/rules/detect-weak-password-validation)               | CWE-521  |       | 7.5  | [detect-weak-password-validation](./docs/rules/detect-weak-password-validation.md)               |     |     |     |     |     |
| [no-client-side-auth-logic](https://eslint.interlace.tools/docs/secure-coding/rules/no-client-side-auth-logic)                           | CWE-602  |       | 7.5  | [no-client-side-auth-logic](./docs/rules/no-client-side-auth-logic.md)                           |     |     |     |     |     |
| [no-hardcoded-session-tokens](https://eslint.interlace.tools/docs/secure-coding/rules/no-hardcoded-session-tokens)                       | CWE-798  |       | 9.8  | [no-hardcoded-session-tokens](./docs/rules/no-hardcoded-session-tokens.md)                       | 💼  |     |     |     |     |
| [no-unvalidated-deeplinks](https://eslint.interlace.tools/docs/secure-coding/rules/no-unvalidated-deeplinks)                             | CWE-939  |       | 7.5  | [no-unvalidated-deeplinks](./docs/rules/no-unvalidated-deeplinks.md)                             | 💼  |     |     |     |     |
| [require-url-validation](https://eslint.interlace.tools/docs/secure-coding/rules/require-url-validation)                                 | CWE-601  |       | 7.5  | [require-url-validation](./docs/rules/require-url-validation.md)                                 |     |     |     |     |     |
| [require-mime-type-validation](https://eslint.interlace.tools/docs/secure-coding/rules/require-mime-type-validation)                     | CWE-434  |       | 7.5  | [require-mime-type-validation](./docs/rules/require-mime-type-validation.md)                     |     |     |     |     |     |
| [no-arbitrary-file-access](https://eslint.interlace.tools/docs/secure-coding/rules/no-arbitrary-file-access)                             |  CWE-22  |       | 7.5  | [no-arbitrary-file-access](./docs/rules/no-arbitrary-file-access.md)                             |     |     |     |     |     |
| [no-pii-in-logs](https://eslint.interlace.tools/docs/secure-coding/rules/no-pii-in-logs)                                                 | CWE-532  |       | 7.5  | [no-pii-in-logs](./docs/rules/no-pii-in-logs.md)                                                 |     | ⚠️  |     |     |     |
| [no-tracking-without-consent](https://eslint.interlace.tools/docs/secure-coding/rules/no-tracking-without-consent)                       | CWE-359  |       | 7.5  | [no-tracking-without-consent](./docs/rules/no-tracking-without-consent.md)                       |     |     |     |     |     |
| [no-sensitive-data-in-analytics](https://eslint.interlace.tools/docs/secure-coding/rules/no-sensitive-data-in-analytics)                 | CWE-359  |       | 7.5  | [no-sensitive-data-in-analytics](./docs/rules/no-sensitive-data-in-analytics.md)                 |     |     |     |     |     |
| [require-data-minimization](https://eslint.interlace.tools/docs/secure-coding/rules/require-data-minimization)                           | CWE-213  |       | 7.5  | [require-data-minimization](./docs/rules/require-data-minimization.md)                           |     |     |     |     |     |
| [no-debug-code-in-production](https://eslint.interlace.tools/docs/secure-coding/rules/no-debug-code-in-production)                       | CWE-489  |       | 7.5  | [no-debug-code-in-production](./docs/rules/no-debug-code-in-production.md)                       |     |     |     |     |     |
| [require-code-minification](https://eslint.interlace.tools/docs/secure-coding/rules/require-code-minification)                           | CWE-656  |       | 7.5  | [require-code-minification](./docs/rules/require-code-minification.md)                           |     |     |     |     |     |
| [no-verbose-error-messages](https://eslint.interlace.tools/docs/secure-coding/rules/no-verbose-error-messages)                           | CWE-209  |       | 7.5  | [no-verbose-error-messages](./docs/rules/no-verbose-error-messages.md)                           |     | ⚠️  |     |     |     |
| [require-secure-defaults](https://eslint.interlace.tools/docs/secure-coding/rules/require-secure-defaults)                               | CWE-276  |       | 7.5  | [require-secure-defaults](./docs/rules/require-secure-defaults.md)                               |     |     |     |     |     |
| [no-sensitive-data-in-cache](https://eslint.interlace.tools/docs/secure-coding/rules/no-sensitive-data-in-cache)                         | CWE-524  |       | 7.5  | [no-sensitive-data-in-cache](./docs/rules/no-sensitive-data-in-cache.md)                         |     |     |     |     |     |
| [no-data-in-temp-storage](https://eslint.interlace.tools/docs/secure-coding/rules/no-data-in-temp-storage)                               | CWE-312  |       | 7.5  | [no-data-in-temp-storage](./docs/rules/no-data-in-temp-storage.md)                               |     |     |     |     |     |
| [require-secure-deletion](https://eslint.interlace.tools/docs/secure-coding/rules/require-secure-deletion)                               | CWE-459  |       | 7.5  | [require-secure-deletion](./docs/rules/require-secure-deletion.md)                               |     |     |     |     |     |
| [require-storage-encryption](https://eslint.interlace.tools/docs/secure-coding/rules/require-storage-encryption)                         | CWE-311  |       | 7.5  | [require-storage-encryption](./docs/rules/require-storage-encryption.md)                         |     |     |     |     |     |
| [no-unencrypted-local-storage](https://eslint.interlace.tools/docs/secure-coding/rules/no-unencrypted-local-storage)                     | CWE-312  |       | 7.5  | [no-unencrypted-local-storage](./docs/rules/no-unencrypted-local-storage.md)                     |     |     |     |     |     |
| [require-credential-storage](https://eslint.interlace.tools/docs/secure-coding/rules/require-credential-storage)                         | CWE-522  |       | 7.5  | [require-credential-storage](./docs/rules/require-credential-storage.md)                         |     |     |     |     |     |
| [no-exposed-debug-endpoints](https://eslint.interlace.tools/docs/secure-coding/rules/no-exposed-debug-endpoints)                         | CWE-489  |       | 7.5  | [no-exposed-debug-endpoints](./docs/rules/no-exposed-debug-endpoints.md)                         |     |     |     |     |     |
| [detect-non-literal-fs-filename](https://eslint.interlace.tools/docs/secure-coding/rules/detect-non-literal-fs-filename)                 |  CWE-22  |       | 7.5  | [detect-non-literal-fs-filename](./docs/rules/detect-non-literal-fs-filename.md)                 | 💼  |     |     |     |     |
| [no-zip-slip](https://eslint.interlace.tools/docs/secure-coding/rules/no-zip-slip)                                                       |  CWE-22  |       | 8.1  | [no-zip-slip](./docs/rules/no-zip-slip.md)                                                       | 💼  |     |     |     |     |
| [no-toctou-vulnerability](https://eslint.interlace.tools/docs/secure-coding/rules/no-toctou-vulnerability)                               | CWE-367  |       | 7.0  | [no-toctou-vulnerability](./docs/rules/no-toctou-vulnerability.md)                               | 💼  |     |     | 💡  |     |
| [detect-non-literal-regexp](https://eslint.interlace.tools/docs/secure-coding/rules/detect-non-literal-regexp)                           | CWE-400  |       | 7.5  | [detect-non-literal-regexp](./docs/rules/detect-non-literal-regexp.md)                           |     | ⚠️  |     |     |     |
| [no-redos-vulnerable-regex](https://eslint.interlace.tools/docs/secure-coding/rules/no-redos-vulnerable-regex)                           | CWE-1333 |       | 7.5  | [no-redos-vulnerable-regex](./docs/rules/no-redos-vulnerable-regex.md)                           | 💼  |     |     | 💡  |     |
| [no-unsafe-regex-construction](https://eslint.interlace.tools/docs/secure-coding/rules/no-unsafe-regex-construction)                     | CWE-400  |       | 7.5  | [no-unsafe-regex-construction](./docs/rules/no-unsafe-regex-construction.md)                     |     | ⚠️  |     | 💡  |     |
| [detect-object-injection](https://eslint.interlace.tools/docs/secure-coding/rules/detect-object-injection)                               | CWE-915  |       | 7.3  | [detect-object-injection](./docs/rules/detect-object-injection.md)                               |     | ⚠️  |     |     |     |
| [no-unsafe-deserialization](https://eslint.interlace.tools/docs/secure-coding/rules/no-unsafe-deserialization)                           | CWE-502  |       | 9.8  | [no-unsafe-deserialization](./docs/rules/no-unsafe-deserialization.md)                           | 💼  |     |     |     |     |
| [no-weak-crypto](https://eslint.interlace.tools/docs/secure-coding/rules/no-weak-crypto)                                                 | CWE-327  |       | 7.5  | [no-weak-crypto](./docs/rules/no-weak-crypto.md)                                                 | 💼  |     |     |     | 🚫  |
| [no-insufficient-random](https://eslint.interlace.tools/docs/secure-coding/rules/no-insufficient-random)                                 | CWE-330  |       | 5.3  | [no-insufficient-random](./docs/rules/no-insufficient-random.md)                                 |     | ⚠️  |     |     | 🚫  |
| [no-timing-attack](https://eslint.interlace.tools/docs/secure-coding/rules/no-timing-attack)                                             | CWE-208  |       | 5.9  | [no-timing-attack](./docs/rules/no-timing-attack.md)                                             | 💼  |     |     |     | 🚫  |
| [no-insecure-comparison](https://eslint.interlace.tools/docs/secure-coding/rules/no-insecure-comparison)                                 | CWE-697  |       | 5.3  | [no-insecure-comparison](./docs/rules/no-insecure-comparison.md)                                 |     | ⚠️  | 🔧  |     | 🚫  |
| [no-insecure-jwt](https://eslint.interlace.tools/docs/secure-coding/rules/no-insecure-jwt)                                               | CWE-347  |       | 7.5  | [no-insecure-jwt](./docs/rules/no-insecure-jwt.md)                                               | 💼  |     |     |     | 🚫  |
| [no-unvalidated-user-input](https://eslint.interlace.tools/docs/secure-coding/rules/no-unvalidated-user-input)                           |  CWE-20  |       | 8.6  | [no-unvalidated-user-input](./docs/rules/no-unvalidated-user-input.md)                           |     | ⚠️  |     |     |     |
| [no-unsanitized-html](https://eslint.interlace.tools/docs/secure-coding/rules/no-unsanitized-html)                                       |  CWE-79  |       | 6.1  | [no-unsanitized-html](./docs/rules/no-unsanitized-html.md)                                       | 💼  |     |     |     |     |
| [no-unescaped-url-parameter](https://eslint.interlace.tools/docs/secure-coding/rules/no-unescaped-url-parameter)                         |  CWE-79  |       | 6.1  | [no-unescaped-url-parameter](./docs/rules/no-unescaped-url-parameter.md)                         |     | ⚠️  |     |     |     |
| [no-improper-sanitization](https://eslint.interlace.tools/docs/secure-coding/rules/no-improper-sanitization)                             | CWE-116  |       | 7.5  | [no-improper-sanitization](./docs/rules/no-improper-sanitization.md)                             | 💼  |     |     |     |     |
| [no-improper-type-validation](https://eslint.interlace.tools/docs/secure-coding/rules/no-improper-type-validation)                       |  CWE-20  |       | 5.3  | [no-improper-type-validation](./docs/rules/no-improper-type-validation.md)                       |     | ⚠️  |     |     |     |
| [no-missing-authentication](https://eslint.interlace.tools/docs/secure-coding/rules/no-missing-authentication)                           | CWE-306  |       | 9.8  | [no-missing-authentication](./docs/rules/no-missing-authentication.md)                           |     | ⚠️  |     |     |     |
| [no-privilege-escalation](https://eslint.interlace.tools/docs/secure-coding/rules/no-privilege-escalation)                               | CWE-269  |       | 8.8  | [no-privilege-escalation](./docs/rules/no-privilege-escalation.md)                               |     | ⚠️  |     |     |     |
| [no-weak-password-recovery](https://eslint.interlace.tools/docs/secure-coding/rules/no-weak-password-recovery)                           | CWE-640  |       | 9.8  | [no-weak-password-recovery](./docs/rules/no-weak-password-recovery.md)                           | 💼  |     |     |     |     |
| [no-insecure-cookie-settings](https://eslint.interlace.tools/docs/secure-coding/rules/no-insecure-cookie-settings)                       | CWE-614  |       | 5.3  | [no-insecure-cookie-settings](./docs/rules/no-insecure-cookie-settings.md)                       |     | ⚠️  |     |     | 🚫  |
| [no-missing-csrf-protection](https://eslint.interlace.tools/docs/secure-coding/rules/no-missing-csrf-protection)                         | CWE-352  |       | 8.8  | [no-missing-csrf-protection](./docs/rules/no-missing-csrf-protection.md)                         |     | ⚠️  |     |     | 🚫  |
| [no-document-cookie](https://eslint.interlace.tools/docs/secure-coding/rules/no-document-cookie)                                         | CWE-565  |       | 4.3  | [no-document-cookie](./docs/rules/no-document-cookie.md)                                         |     | ⚠️  |     | 💡  |     |
| [no-missing-cors-check](https://eslint.interlace.tools/docs/secure-coding/rules/no-missing-cors-check)                                   | CWE-942  |       | 7.5  | [no-missing-cors-check](./docs/rules/no-missing-cors-check.md)                                   |     | ⚠️  |     |     | 🚫  |
| [no-missing-security-headers](https://eslint.interlace.tools/docs/secure-coding/rules/no-missing-security-headers)                       | CWE-693  |       | 5.3  | [no-missing-security-headers](./docs/rules/no-missing-security-headers.md)                       |     | ⚠️  |     | 💡  | 🚫  |
| [no-insecure-redirects](https://eslint.interlace.tools/docs/secure-coding/rules/no-insecure-redirects)                                   | CWE-601  |       | 6.1  | [no-insecure-redirects](./docs/rules/no-insecure-redirects.md)                                   |     | ⚠️  |     | 💡  |     |
| [no-unencrypted-transmission](https://eslint.interlace.tools/docs/secure-coding/rules/no-unencrypted-transmission)                       | CWE-319  |       | 7.5  | [no-unencrypted-transmission](./docs/rules/no-unencrypted-transmission.md)                       |     | ⚠️  |     |     |     |
| [no-clickjacking](https://eslint.interlace.tools/docs/secure-coding/rules/no-clickjacking)                                               | CWE-1021 |       | 6.1  | [no-clickjacking](./docs/rules/no-clickjacking.md)                                               | 💼  |     |     |     | 🚫  |
| [no-exposed-sensitive-data](https://eslint.interlace.tools/docs/secure-coding/rules/no-exposed-sensitive-data)                           | CWE-200  |       | 7.5  | [no-exposed-sensitive-data](./docs/rules/no-exposed-sensitive-data.md)                           | 💼  |     |     |     |     |
| [no-sensitive-data-exposure](https://eslint.interlace.tools/docs/secure-coding/rules/no-sensitive-data-exposure)                         | CWE-532  |       | 5.5  | [no-sensitive-data-exposure](./docs/rules/no-sensitive-data-exposure.md)                         |     | ⚠️  |     | 💡  |     |
| [no-buffer-overread](https://eslint.interlace.tools/docs/secure-coding/rules/no-buffer-overread)                                         | CWE-126  |       | 7.5  | [no-buffer-overread](./docs/rules/no-buffer-overread.md)                                         | 💼  |     |     |     |     |
| [no-unlimited-resource-allocation](https://eslint.interlace.tools/docs/secure-coding/rules/no-unlimited-resource-allocation)             | CWE-770  |       | 7.5  | [no-unlimited-resource-allocation](./docs/rules/no-unlimited-resource-allocation.md)             | 💼  |     |     |     |     |
| [no-unchecked-loop-condition](https://eslint.interlace.tools/docs/secure-coding/rules/no-unchecked-loop-condition)                       | CWE-835  |       | 7.5  | [no-unchecked-loop-condition](./docs/rules/no-unchecked-loop-condition.md)                       | 💼  |     |     |     |     |
| [no-electron-security-issues](https://eslint.interlace.tools/docs/secure-coding/rules/no-electron-security-issues)                       | CWE-693  |       | 8.8  | [no-electron-security-issues](./docs/rules/no-electron-security-issues.md)                       | 💼  |     |     |     |     |
| [no-insufficient-postmessage-validation](https://eslint.interlace.tools/docs/secure-coding/rules/no-insufficient-postmessage-validation) | CWE-346  |       | 8.8  | [no-insufficient-postmessage-validation](./docs/rules/no-insufficient-postmessage-validation.md) | 💼  |     |     |     |     |
| [Deprecated](https://eslint.interlace.tools/docs/secure-coding/rules/Deprecated)                                                         |          |       |      | Deprecated Rules                                                                                 |     |     |     |     |     |

## 🔗 Related ESLint Plugins

Part of the **Interlace ESLint Ecosystem** — AI-native security plugins with LLM-optimized error messages:

| Plugin                                                                                               |                                                                              Downloads                                                                               | Description                                 |
| :--------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------: | :------------------------------------------ |
| [`eslint-plugin-secure-coding`](https://www.npmjs.com/package/eslint-plugin-secure-coding)           |      [![downloads](https://img.shields.io/npm/dt/eslint-plugin-secure-coding.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-secure-coding)      | General security rules & OWASP guidelines.  |
| [`eslint-plugin-pg`](https://www.npmjs.com/package/eslint-plugin-pg)                                 |                 [![downloads](https://img.shields.io/npm/dt/eslint-plugin-pg.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-pg)                 | PostgreSQL security & best practices.       |
| [`eslint-plugin-crypto`](https://www.npmjs.com/package/eslint-plugin-crypto)                         |             [![downloads](https://img.shields.io/npm/dt/eslint-plugin-crypto.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-crypto)             | NodeJS Cryptography security rules.         |
| [`eslint-plugin-jwt`](https://www.npmjs.com/package/eslint-plugin-jwt)                               |                [![downloads](https://img.shields.io/npm/dt/eslint-plugin-jwt.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-jwt)                | JWT security & best practices.              |
| [`eslint-plugin-browser-security`](https://www.npmjs.com/package/eslint-plugin-browser-security)     |   [![downloads](https://img.shields.io/npm/dt/eslint-plugin-browser-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-browser-security)   | Browser-specific security & XSS prevention. |
| [`eslint-plugin-vercel-ai-security`](https://www.npmjs.com/package/eslint-plugin-vercel-ai-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-vercel-ai-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-vercel-ai-security) | Vercel AI SDK security rules.               |
| [`eslint-plugin-express-security`](https://www.npmjs.com/package/eslint-plugin-express-security)     |   [![downloads](https://img.shields.io/npm/dt/eslint-plugin-express-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-express-security)   | Express.js security hardening rules.        |
| [`eslint-plugin-lambda-security`](https://www.npmjs.com/package/eslint-plugin-lambda-security)       |    [![downloads](https://img.shields.io/npm/dt/eslint-plugin-lambda-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-lambda-security)    | AWS Lambda security best practices.         |
| [`eslint-plugin-nestjs-security`](https://www.npmjs.com/package/eslint-plugin-nestjs-security)       |    [![downloads](https://img.shields.io/npm/dt/eslint-plugin-nestjs-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-nestjs-security)    | NestJS security rules & patterns.           |
| [`eslint-plugin-import-next`](https://www.npmjs.com/package/eslint-plugin-import-next)               |        [![downloads](https://img.shields.io/npm/dt/eslint-plugin-import-next.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-import-next)        | Next-gen import sorting & architecture.     |

## 📄 License

MIT © [Ofri Peretz](https://github.com/ofri-peretz)

<p align="center">
  <a href="https://eslint.interlace.tools/docs/secure-coding"><img src="https://eslint.interlace.tools/images/og-secure-coding.png" alt="ESLint Interlace Plugin" width="300" /></a>
</p>
