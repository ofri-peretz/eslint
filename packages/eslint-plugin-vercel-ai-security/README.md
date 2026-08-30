<p align="center">
  <a href="https://eslint.interlace.tools/?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-vercel-ai-security" target="blank"><img src="https://eslint.interlace.tools/logos/interlace.svg" alt="Interlace" height="90" /></a>
  &nbsp;&nbsp;
  <a href="https://vercel.com/docs/ai-sdk" target="_blank"><img src="https://eslint.interlace.tools/logos/vercel.svg" alt="Vercel AI SDK" height="90" /></a>
  &nbsp;&nbsp;
  <a href="https://oxc.rs" target="_blank"><img src="https://eslint.interlace.tools/logos/oxlint.svg" alt="oxlint" height="90" /></a>
  &nbsp;&nbsp;
  <a href="https://eslint.org" target="_blank"><img src="https://eslint.interlace.tools/logos/eslint.svg" alt="ESLint" height="90" /></a>
</p>

<p align="center">
  Security rules for Vercel AI SDK usage (prompt injection, data handling).
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/eslint-plugin-vercel-ai-security" target="_blank"><img src="https://img.shields.io/npm/v/eslint-plugin-vercel-ai-security.svg" alt="NPM Version" /></a>
  <a href="https://www.npmjs.com/package/eslint-plugin-vercel-ai-security" target="_blank"><img src="https://img.shields.io/npm/dm/eslint-plugin-vercel-ai-security.svg" alt="NPM Downloads" /></a>
  <a href="https://opensource.org/licenses/MIT" target="_blank"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="Package License" /></a>
  <a href="https://app.codecov.io/gh/ofri-peretz/eslint/components?components%5B0%5D=eslint-plugin-vercel-ai-security" target="_blank"><img src="https://codecov.io/gh/ofri-peretz/eslint/graph/badge.svg?component=eslint-plugin-vercel-ai-security" alt="Codecov" /></a>
  <a href="https://github.com/ofri-peretz/eslint" target="_blank"><img src="https://img.shields.io/badge/Since-Dec_2025-blue?logo=rocket&logoColor=white" alt="Since Dec 2025" /></a>
  <a href="https://scorecard.dev/viewer/?uri=github.com/ofri-peretz/eslint" target="_blank"><img src="https://api.securityscorecards.dev/projects/github.com/ofri-peretz/eslint/badge" alt="OpenSSF Scorecard" /></a>
</p>

> ⭐ If this plugin caught a real bug for you, [**star the repo**](https://github.com/ofri-peretz/eslint) — it's the signal that keeps these rules maintained.

## Description

This plugin provides Security rules for Vercel AI SDK usage (prompt injection, data handling).

<!-- AUTO-GENERATED:DOCTRINE:START - Do not edit manually -->

## Why these rules are quiet

**A linter nobody reads protects nothing.** One that reports a thousand things a
week gets switched off in a month, and the real finding goes with it. We would
rather miss a finding than spend your attention on one that was never real.

## How they decide

**Evidence, not names.** A rule fires on what the code *does*, resolved through the
AST and ESLint's own scope analysis — never on a variable that happens to be called
`query`, or a file whose path contains `key`. Every one of those was a real false
positive here, found by reading our own output on open-source projects and fixed
with a test that fails on the unfixed rule.

## What you get

**Every finding arrives with its fix** — in prose for a human, as structured JSON
for an agent, and, on security rules, with a CWE mapping and a CVSS score where one
is assigned. That trade costs recall, and we measure what it costs rather than
assuming it is free:
[methodology](https://github.com/ofri-peretz/eslint/blob/main/BENCHMARK-METHODOLOGY.md)
and [results](https://github.com/ofri-peretz/eslint/blob/main/BENCHMARK-RESULTS.md).
If a finding is wrong, [open an issue](https://github.com/ofri-peretz/eslint/issues) —
a false positive is a bug here, not a tuning exercise for you.

<!-- AUTO-GENERATED:DOCTRINE:END -->

## Getting Started

- To check out the [guide](https://eslint.interlace.tools/docs/security/plugin-vercel-ai-security?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-vercel-ai-security), visit [eslint.interlace.tools](https://eslint.interlace.tools/?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-vercel-ai-security). 📚

```bash
npm install eslint-plugin-vercel-ai-security --save-dev
```

## ⚙️ Configuration Presets
| Preset        | Description                              |
| :------------ | :--------------------------------------- |
| `recommended` | Balanced security (7 errors, 7 warnings) |
| `strict`      | Maximum security (17 errors, 2 warnings) |
| `minimal`     | Minimal config                           |

## 📚 Supported Libraries
| Library              | npm                                                                                               | Downloads                                                                                                | Detection                      |
| -------------------- | ------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | ------------------------------ |
| `ai` (Vercel AI SDK) | [![npm](https://img.shields.io/npm/v/ai.svg?style=flat-square)](https://www.npmjs.com/package/ai) | [![downloads](https://img.shields.io/npm/dt/ai.svg?style=flat-square)](https://www.npmjs.com/package/ai) | Prompt Injection, Data Leakage |

## 🤖 AI-Agent Optimized Messages
All rule messages follow a structured format optimized for AI coding assistants:

```
🔒 CWE-74 OWASP:A03-Injection CVSS:9 | Unsafe Prompt | CRITICAL [SOC2,GDPR]
   Fix: Validate input before use | https://owasp.org/...
```

By providing this structured context (CWE, OWASP, Fix), we enable AI tools to **reason** about the security flaw rather than hallucinating. This allows Copilot/Cursor to suggest the _exact_ correct fix immediately.

## 🔧 Supported AI SDK Functions
| Function               | Full Coverage                  |
| ---------------------- | ------------------------------ |
| `generateText`         | ✅ All 19 rules                |
| `streamText`           | ✅ All 19 rules + abort signal |
| `generateObject`       | ✅ All 19 rules                |
| `streamObject`         | ✅ All 19 rules + abort signal |
| `tool()` helper        | ✅ Schema validation           |
| `embed()` / embeddings | ✅ Embedding validation        |

## 📊 Test Coverage
| Metric        | Coverage |
| ------------- | -------- |
| **Rules**     | 19       |
| **Tests**     | 200      |
| **Lines**     | 98%+     |
| **Functions** | 100%     |

## 🙋 FAQ
### What's the difference between this and generic AI security linters?

Generic linters guess at patterns. This plugin knows the **exact** Vercel AI SDK API.

### Does this work with ESLint 9 Flat Config?

Yes! Designed specifically for ESLint Flat Config — works on ESLint 8 (with flat config), 9, and 10. See the [ESLint Version Support Policy](../../docs/ESLINT_VERSION_SUPPORT.md) for the full matrix.

### How do I suppress a rule for a specific line?

```typescript
// eslint-disable-next-line vercel-ai-security/require-validated-prompt
await generateText({ prompt: internalPrompt });
```

### Why is ASI06 (Memory Corruption) not covered?

TypeScript/JavaScript are memory-safe languages. Memory corruption vulnerabilities (buffer overflows, use-after-free, etc.) are not possible in these environments.

## 📦 Compatibility
| Package              | Version                                                                                                   |
| -------------------- | --------------------------------------------------------------------------------------------------------- |
| `ai` (Vercel AI SDK) | [![npm](https://img.shields.io/npm/v/ai.svg?style=flat-square)](https://www.npmjs.com/package/ai)         |
| ESLint               | [![npm](https://img.shields.io/npm/v/eslint.svg?style=flat-square)](https://www.npmjs.com/package/eslint) |
| Node.js              | [![node](https://img.shields.io/badge/node-%5E18.0.0-green?style=flat-square)](https://nodejs.org/)       |

See the [ESLint Version Support Policy](../../docs/ESLINT_VERSION_SUPPORT.md) for the full matrix.

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
| [no-dynamic-system-prompt](https://eslint.interlace.tools/docs/security/plugin-vercel-ai-security/rules/no-dynamic-system-prompt?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-vercel-ai-security) | CWE-74 |  |  | This rule identifies code patterns where system prompts contain dynamic or user-controlled content | 🟢 |  |  |  |  |  |
| [no-hardcoded-api-keys](https://eslint.interlace.tools/docs/security/plugin-vercel-ai-security/rules/no-hardcoded-api-keys?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-vercel-ai-security) | CWE-798 |  |  | This rule identifies hardcoded API keys, tokens, and secrets in your codebase that are used with AI SDK pro… | 🟢 |  |  |  |  |  |
| [no-sensitive-in-prompt](https://eslint.interlace.tools/docs/security/plugin-vercel-ai-security/rules/no-sensitive-in-prompt?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-vercel-ai-security) | CWE-200 |  |  | This rule identifies code patterns where sensitive data like passwords, API keys, tokens, or personally ide… | 🟢 |  |  |  |  |  |
| [no-system-prompt-leak](https://eslint.interlace.tools/docs/security/plugin-vercel-ai-security/rules/no-system-prompt-leak?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-vercel-ai-security) | CWE-200 |  |  | This rule identifies code patterns where system prompts or AI instructions are returned in API responses, l… | 🟢 |  |  |  |  |  |
| [no-training-data-exposure](https://eslint.interlace.tools/docs/security/plugin-vercel-ai-security/rules/no-training-data-exposure?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-vercel-ai-security) | CWE-359 |  |  | This rule identifies code patterns where user data might be sent to LLM training endpoints or when training… | 🟢 |  |  |  |  |  |
| [no-unsafe-output-handling](https://eslint.interlace.tools/docs/security/plugin-vercel-ai-security/rules/no-unsafe-output-handling?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-vercel-ai-security) | CWE-94 |  |  | This rule identifies code patterns where AI-generated output is passed directly to dangerous functions that… | 🟢 |  |  |  |  |  |
| [require-abort-signal](https://eslint.interlace.tools/docs/security/plugin-vercel-ai-security/rules/require-abort-signal?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-vercel-ai-security) | CWE-404 |  |  | This rule identifies streaming AI SDK calls (streamText, streamObject) that don't include an AbortSignal fo… | 🟢 |  |  |  |  |  |
| [require-audit-logging](https://eslint.interlace.tools/docs/security/plugin-vercel-ai-security/rules/require-audit-logging?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-vercel-ai-security) | CWE-778 |  |  | This rule identifies AI SDK calls that aren't preceded by logging statements | 🟢 |  |  |  |  |  |
| [require-embedding-validation](https://eslint.interlace.tools/docs/security/plugin-vercel-ai-security/rules/require-embedding-validation?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-vercel-ai-security) | CWE-20 |  |  | This rule identifies code patterns where embeddings are stored in vector databases without validation. | 🟢 |  |  |  |  |  |
| [require-error-handling](https://eslint.interlace.tools/docs/security/plugin-vercel-ai-security/rules/require-error-handling?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-vercel-ai-security) | CWE-755 |  |  | This rule identifies AI SDK calls that aren't wrapped in try-catch blocks | 🟢 |  |  |  |  |  |
| [require-max-steps](https://eslint.interlace.tools/docs/security/plugin-vercel-ai-security/rules/require-max-steps?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-vercel-ai-security) | CWE-834 |  |  | This rule identifies AI SDK calls that use tools but don't specify a step limit (maxSteps or stopWhen) | 🟢 |  |  |  |  |  |
| [require-max-tokens](https://eslint.interlace.tools/docs/security/plugin-vercel-ai-security/rules/require-max-tokens?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-vercel-ai-security) | CWE-770 |  |  | This rule identifies AI SDK calls that don't specify a token limit (maxTokens or maxOutputTokens) | 🟢 |  |  |  |  |  |
| [require-output-filtering](https://eslint.interlace.tools/docs/security/plugin-vercel-ai-security/rules/require-output-filtering?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-vercel-ai-security) | CWE-200 |  |  | This rule identifies tool execute functions that return raw data from data sources (databases, APIs, file s… | 🟢 |  |  |  |  |  |
| [require-output-validation](https://eslint.interlace.tools/docs/security/plugin-vercel-ai-security/rules/require-output-validation?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-vercel-ai-security) | CWE-707 |  |  | This rule identifies code patterns where AI-generated output is displayed to users without validation or fa… | 🟢 |  |  |  |  |  |
| [require-rag-content-validation](https://eslint.interlace.tools/docs/security/plugin-vercel-ai-security/rules/require-rag-content-validation?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-vercel-ai-security) | CWE-74 |  |  | This rule identifies code patterns where content retrieved from vector stores or document retrieval systems… | 🟢 |  |  |  |  |  |
| [require-request-timeout](https://eslint.interlace.tools/docs/security/plugin-vercel-ai-security/rules/require-request-timeout?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-vercel-ai-security) | CWE-400 |  |  | This rule identifies AI SDK calls that don't have timeout or abort signal configuration. | 🟢 |  |  |  |  |  |
| [require-tool-confirmation](https://eslint.interlace.tools/docs/security/plugin-vercel-ai-security/rules/require-tool-confirmation?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-vercel-ai-security) | CWE-862 |  |  | This rule identifies destructive tools (delete, transfer, execute, etc.) that don't require human confirmat… | 🟢 |  |  |  |  |  |
| [require-tool-schema](https://eslint.interlace.tools/docs/security/plugin-vercel-ai-security/rules/require-tool-schema?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-vercel-ai-security) | CWE-20 |  |  | Get weather | 🟢 |  |  |  |  |  |
| [require-validated-prompt](https://eslint.interlace.tools/docs/security/plugin-vercel-ai-security/rules/require-validated-prompt?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-vercel-ai-security) | CWE-74 |  |  | This rule identifies code patterns where user-controlled input is passed directly to AI prompts without val… | 🟢 |  |  |  |  |  |
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
| [`eslint-plugin-secure-coding`](https://www.npmjs.com/package/eslint-plugin-secure-coding) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-secure-coding.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-secure-coding) | Injection prevention. |
| [`eslint-plugin-sequelize-security`](https://www.npmjs.com/package/eslint-plugin-sequelize-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-sequelize-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-sequelize-security) | Sequelize ORM security. |
| [`eslint-plugin-sqlite-security`](https://www.npmjs.com/package/eslint-plugin-sqlite-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-sqlite-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-sqlite-security) | SQLite security. |
| [`eslint-plugin-typeorm-security`](https://www.npmjs.com/package/eslint-plugin-typeorm-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-typeorm-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-typeorm-security) | TypeORM security. |

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
  <a href="https://eslint.interlace.tools/docs/security/plugin-vercel-ai-security?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-vercel-ai-security"><img src="https://eslint.interlace.tools/images/og-vercel-ai-security.png" alt="ESLint Interlace Plugin" width="100%" /></a>
</p>

<p align="center">
  <a href="https://eslint.interlace.tools/?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-vercel-ai-security" target="blank"><img src="https://eslint.interlace.tools/logos/interlace.svg" alt="Interlace" height="70" /></a>
</p>
