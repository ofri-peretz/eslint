<p align="center">
  <a href="https://eslint.interlace.tools/?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-express-security" target="blank"><img src="https://eslint.interlace.tools/logos/interlace.svg" alt="Interlace" height="90" /></a>
  &nbsp;&nbsp;
  <a href="https://expressjs.com" target="_blank"><img src="https://eslint.interlace.tools/logos/express.svg" alt="Express" height="90" /></a>
  &nbsp;&nbsp;
  <a href="https://oxc.rs" target="_blank"><img src="https://eslint.interlace.tools/logos/oxlint.svg" alt="oxlint" height="90" /></a>
  &nbsp;&nbsp;
  <a href="https://eslint.org" target="_blank"><img src="https://eslint.interlace.tools/logos/eslint.svg" alt="ESLint" height="90" /></a>
</p>

<p align="center">
  Comprehensive security rules for Express.js applications, mapping to OWASP Top 10.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/eslint-plugin-express-security" target="_blank"><img src="https://img.shields.io/npm/v/eslint-plugin-express-security.svg" alt="NPM Version" /></a>
  <a href="https://www.npmjs.com/package/eslint-plugin-express-security" target="_blank"><img src="https://img.shields.io/npm/dm/eslint-plugin-express-security.svg" alt="NPM Downloads" /></a>
  <a href="https://opensource.org/licenses/MIT" target="_blank"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="Package License" /></a>
  <a href="https://app.codecov.io/gh/ofri-peretz/eslint/components?components%5B0%5D=eslint-plugin-express-security" target="_blank"><img src="https://codecov.io/gh/ofri-peretz/eslint/graph/badge.svg?component=eslint-plugin-express-security" alt="Codecov" /></a>
  <a href="https://github.com/ofri-peretz/eslint" target="_blank"><img src="https://img.shields.io/badge/Since-Dec_2025-blue?logo=rocket&logoColor=white" alt="Since Dec 2025" /></a>
  <a href="https://scorecard.dev/viewer/?uri=github.com/ofri-peretz/eslint" target="_blank"><img src="https://api.securityscorecards.dev/projects/github.com/ofri-peretz/eslint/badge" alt="OpenSSF Scorecard" /></a>
</p>

> ⭐ If this plugin caught a real bug for you, [**star the repo**](https://github.com/ofri-peretz/eslint) — it's the signal that keeps these rules maintained.

## Description

This plugin provides Comprehensive security rules for Express.js applications, mapping to OWASP Top 10.

## Philosophy

**Interlace** fosters **strength through integration**. Instead of stacking isolated rules, we **interlace** security directly into your workflow to create a resilient fabric of code. We believe tools should **guide rather than gatekeep**, providing educational feedback that strengthens the developer with every interaction.

<!-- AUTO-GENERATED:DOCTRINE:START - Do not edit manually -->

## Why these rules are quiet

**Noise creates apathy, and apathy is not a security posture.** A linter that reports
a thousand things a week gets switched off in a month, and the real finding goes with
it. So every rule here is built to be worth reading: we would rather miss a finding
than spend your attention on one that was never real.

That is a trade, and it is made deliberately. It costs recall, and we measure what it
costs rather than assuming it is free.

## How the rules decide

**Evidence, not names.** A rule fires on what the code *does*, resolved through the
AST and ESLint's own scope analysis — not on an identifier that happens to contain
`query`, a method called `setItem`, or a file whose path contains `key`. Every one of
those was a real false positive in this ecosystem, found by reading our own output on
open-source projects and fixed with a test that fails on the unfixed rule.

Where a rule has known false-positive shapes, its page carries a **Not a finding**
section: what it deliberately stays quiet on, and what to check first when it fires
and you disagree.

## What you get

The rules below. Security rules carry a CWE mapping and, where one is assigned, a
CVSS score; every rule carries a fix on its message — in prose for a human and as
structured JSON for an agent. Install it, enable
`recommended`, and read the findings. If one of them is wrong,
[open an issue](https://github.com/ofri-peretz/eslint/issues) — a false positive is a
bug here, not a tuning exercise for you.

How that is measured, on which projects, and where it falls short:
[benchmark methodology](https://github.com/ofri-peretz/eslint/blob/main/BENCHMARK-METHODOLOGY.md)
and [results](https://github.com/ofri-peretz/eslint/blob/main/BENCHMARK-RESULTS.md).

<!-- AUTO-GENERATED:DOCTRINE:END -->

## Getting Started

- To check out the [guide](https://eslint.interlace.tools/docs/security/plugin-express-security?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-express-security), visit [eslint.interlace.tools](https://eslint.interlace.tools/?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-express-security). 📚
- 要查看中文 [指南](https://eslint.interlace.tools/docs/security/plugin-express-security?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-express-security), 请访问 [eslint.interlace.tools](https://eslint.interlace.tools/?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-express-security). 📚
- [가이드](https://eslint.interlace.tools/docs/security/plugin-express-security?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-express-security) 문서는 [eslint.interlace.tools](https://eslint.interlace.tools/?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-express-security)에서 확인하실 수 있습니다. 📚
- [ガイド](https://eslint.interlace.tools/docs/security/plugin-express-security?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-express-security)は [eslint.interlace.tools](https://eslint.interlace.tools/?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-express-security)でご確認ください。 📚
- Para ver la [guía](https://eslint.interlace.tools/docs/security/plugin-express-security?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-express-security), visita [eslint.interlace.tools](https://eslint.interlace.tools/?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-express-security). 📚
- للاطلاع على [الدليل](https://eslint.interlace.tools/docs/security/plugin-express-security?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-express-security)، قم بزيارة [eslint.interlace.tools](https://eslint.interlace.tools/?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-express-security). 📚

```bash
npm install eslint-plugin-express-security --save-dev
```

## ⚙️ Configuration Presets

| Preset        | Description                                                             |
| :------------ | :---------------------------------------------------------------------- |
| `recommended` | Balanced security for Express projects (critical as error, others warn) |
| `strict`      | Maximum security enforcement (all rules as errors)                      |
| `api`         | HTTP/API security rules only (CORS, CSRF, cookies, rate limiting)       |
| `graphql`     | GraphQL-specific security rules only                                    |

## 📚 Supported Libraries

| Library   | npm                                                                                                         | Downloads                                                                                                          | Detection                |
| :-------- | :---------------------------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------- | :----------------------- |
| `express` | [![npm](https://img.shields.io/npm/v/express.svg?style=flat-square)](https://www.npmjs.com/package/express) | [![downloads](https://img.shields.io/npm/dt/express.svg?style=flat-square)](https://www.npmjs.com/package/express) | Misconfig, DoS           |
| `helmet`  | [![npm](https://img.shields.io/npm/v/helmet.svg?style=flat-square)](https://www.npmjs.com/package/helmet)   | [![downloads](https://img.shields.io/npm/dt/helmet.svg?style=flat-square)](https://www.npmjs.com/package/helmet)   | Missing Security Headers |
| `cors`    | [![npm](https://img.shields.io/npm/v/cors.svg?style=flat-square)](https://www.npmjs.com/package/cors)       | [![downloads](https://img.shields.io/npm/dt/cors.svg?style=flat-square)](https://www.npmjs.com/package/cors)       | Permissive CORS          |
| `csurf`   | [![npm](https://img.shields.io/npm/v/csurf.svg?style=flat-square)](https://www.npmjs.com/package/csurf)     | [![downloads](https://img.shields.io/npm/dt/csurf.svg?style=flat-square)](https://www.npmjs.com/package/csurf)     | Missing CSRF Protection  |

---

## 📦 Compatibility

| Package | Version                           |
| :------ | :-------------------------------- |
| ESLint  | `^8.40.0 \|\| ^9.0.0 \|\| ^10.0.0` |
| Node.js | `>=18.0.0`                        |

See the [ESLint Version Support Policy](../../docs/ESLINT_VERSION_SUPPORT.md) — current ecosystem share data, the 20% gate, and the forward-looking exception that covers v10.

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

<!-- AUTO-GENERATED:RULES_TABLE:START - Do not edit manually -->
| Rule | CWE | OWASP | CVSS | Description | 🧠 | 💼 | ⚠️ | 🔧 | 💡 | 🚫 |
| :--- | :---: | :---: | :---: | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| [no-client-controlled-authorization](https://eslint.interlace.tools/docs/security/plugin-express-security/rules/no-client-controlled-authorization?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-express-security) | CWE-863 | A01:2021 |  | This rule detects access decisions taken on request-supplied role, permission or identity values — the chec… | 🟢 |  | ⚠️ |  |  |  |
| [no-cors-credentials-wildcard](https://eslint.interlace.tools/docs/security/plugin-express-security/rules/no-cors-credentials-wildcard?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-express-security) | CWE-942 |  |  | The rule provides LLM-optimized error messages (Compact 2-line format) with actionable security guidance: | 🟢 | 💼 |  |  |  |  |
| [no-disabled-helmet-protections](https://eslint.interlace.tools/docs/security/plugin-express-security/rules/no-disabled-helmet-protections?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-express-security) | CWE-693 | A05:2021 |  | This rule detects helmet options that switch a shipped security-header default off, leaving a mounted helme… | 🟢 | 💼 |  |  |  |  |
| [no-error-details-in-response](https://eslint.interlace.tools/docs/security/plugin-express-security/rules/no-error-details-in-response?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-express-security) | CWE-209 | A04:2021 |  | Disallow sending caught error objects, stack traces, or spreads of them in HTTP responses. | 🟢 | 💼 |  |  |  |  |
| [no-exposed-debug-endpoints](https://eslint.interlace.tools/docs/security/plugin-express-security/rules/no-exposed-debug-endpoints?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-express-security) | CWE-489 | A05:2021 |  | Identifies potential debug, administration, or testing endpoints that are often left exposed in production… | 🟢 | 💼 |  |  |  |  |
| [no-express-unsafe-regex-route](https://eslint.interlace.tools/docs/security/plugin-express-security/rules/no-express-unsafe-regex-route?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-express-security) | CWE-1333 |  |  | This rule detects Regular Expression Denial of Service (ReDoS) vulnerabilities in Express route patterns | 🟢 | 💼 |  |  |  |  |
| [no-graphql-introspection-production](https://eslint.interlace.tools/docs/security/plugin-express-security/rules/no-graphql-introspection-production?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-express-security) | CWE-200 |  |  | This rule detects GraphQL servers with introspection enabled in production | 🟢 |  | ⚠️ |  |  |  |
| [no-host-header-in-links](https://eslint.interlace.tools/docs/security/plugin-express-security/rules/no-host-header-in-links?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-express-security) | CWE-640 | A07:2021 |  | Disallow building absolute URLs (password-reset and verification links) from the Host or X-Forwarded-Host r… | 🟢 | 💼 |  |  |  |  |
| [no-idor-resource-access](https://eslint.interlace.tools/docs/security/plugin-express-security/rules/no-idor-resource-access?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-express-security) | CWE-639 | A01:2021 |  | This rule detects a resource fetched by an identifier taken straight from the request inside a handler that… | 🟢 |  | ⚠️ |  |  |  |
| [no-insecure-cookie-options](https://eslint.interlace.tools/docs/security/plugin-express-security/rules/no-insecure-cookie-options?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-express-security) | CWE-614 |  |  | The rule provides LLM-optimized error messages (Compact 2-line format) with actionable security guidance: | 🟢 | 💼 |  |  |  |  |
| [no-missing-cors-check](https://eslint.interlace.tools/docs/security/plugin-express-security/rules/no-missing-cors-check?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-express-security) | CWE-346 |  |  | Detects missing CORS validation (wildcard CORS, missing origin check) | 🟢 |  |  |  |  |  |
| [no-missing-csrf-protection](https://eslint.interlace.tools/docs/security/plugin-express-security/rules/no-missing-csrf-protection?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-express-security) | CWE-352 |  |  | Detects missing CSRF token validation in POST/PUT/DELETE requests | 🟢 |  |  |  |  |  |
| [no-missing-security-headers](https://eslint.interlace.tools/docs/security/plugin-express-security/rules/no-missing-security-headers?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-express-security) | CWE-693 |  |  | Detects missing security headers in HTTP responses | 🟢 |  |  |  |  |  |
| [no-permissive-cors](https://eslint.interlace.tools/docs/security/plugin-express-security/rules/no-permissive-cors?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-express-security) | CWE-942 |  |  | Detects overly permissive CORS configurations in Express.js applications | 🟢 | 💼 |  |  |  |  |
| [no-permissive-trust-proxy](https://eslint.interlace.tools/docs/security/plugin-express-security/rules/no-permissive-trust-proxy?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-express-security) | CWE-348 | A05:2021 |  | This rule detects unconditional 'trust proxy' settings, which make req.ip whatever the caller says it is an… | 🟢 | 💼 |  |  |  |  |
| [no-sensitive-data-in-query](https://eslint.interlace.tools/docs/security/plugin-express-security/rules/no-sensitive-data-in-query?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-express-security) | CWE-598 | A04:2021 |  | Disallow reading sensitive-named parameters (password, token, secret, apiKey, ...) from req.query. | 🟢 |  | ⚠️ |  |  |  |
| [no-static-root-exposure](https://eslint.interlace.tools/docs/security/plugin-express-security/rules/no-static-root-exposure?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-express-security) | CWE-548 | A05:2021 |  | Disallow express.static() roots that expose the application directory and any serve-index usage | 🟢 | 💼 |  |  |  |  |
| [no-unsafe-csp-directives](https://eslint.interlace.tools/docs/security/plugin-express-security/rules/no-unsafe-csp-directives?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-express-security) | CWE-79 | A03:2021 |  | This rule detects Content-Security-Policy directives that hand back the protection the header exists to pro… | 🟢 | 💼 |  |  |  |  |
| [no-user-controlled-redirect](https://eslint.interlace.tools/docs/security/plugin-express-security/rules/no-user-controlled-redirect?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-express-security) | CWE-601 |  |  | Disallow res.redirect() with values directly from req.query / req.body / req.params | 🟢 | 💼 |  |  |  |  |
| [no-user-controlled-render-locals](https://eslint.interlace.tools/docs/security/plugin-express-security/rules/no-user-controlled-render-locals?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-express-security) | CWE-73 | A03:2021 |  | Disallow res.render() with locals or view names sourced wholesale from req.body / req.query / req.params | 🟢 | 💼 |  |  |  |  |
| [require-case-insensitive-path-guard](https://eslint.interlace.tools/docs/security/plugin-express-security/rules/require-case-insensitive-path-guard?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-express-security) | CWE-178 | A01:2021 |  | This rule detects path-based authorization guards that compare req.path case-sensitively, which case-insens… | 🟢 |  | ⚠️ |  |  |  |
| [require-csrf-protection](https://eslint.interlace.tools/docs/security/plugin-express-security/rules/require-csrf-protection?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-express-security) | CWE-352 |  |  | The rule provides LLM-optimized error messages (Compact 2-line format) with actionable security guidance: | 🟢 |  | ⚠️ |  |  |  |
| [require-express-body-parser-limits](https://eslint.interlace.tools/docs/security/plugin-express-security/rules/require-express-body-parser-limits?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-express-security) | CWE-400 |  |  | The rule provides LLM-optimized error messages (Compact 2-line format) with actionable security guidance: | 🟢 |  | ⚠️ |  |  |  |
| [require-helmet](https://eslint.interlace.tools/docs/security/plugin-express-security/rules/require-helmet?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-express-security) | CWE-693 |  |  | This rule detects Express.js applications that are missing the helmet middleware | 🟢 | 💼 |  |  |  |  |
| [require-query-type-guard](https://eslint.interlace.tools/docs/security/plugin-express-security/rules/require-query-type-guard?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-express-security) | CWE-843 | A03:2021 |  | This rule detects string methods called on req.query values without a type guard — Express query values can… | 🟢 |  | ⚠️ |  |  |  |
| [require-rate-limiting](https://eslint.interlace.tools/docs/security/plugin-express-security/rules/require-rate-limiting?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-express-security) | CWE-770 |  |  | This rule detects Express.js applications missing rate-limiting middleware | 🟢 | 💼 |  |  |  |  |
| [require-route-authentication](https://eslint.interlace.tools/docs/security/plugin-express-security/rules/require-route-authentication?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-express-security) | CWE-306 | A07:2021 |  | This rule detects routes that expose a critical function — credentials, accounts, payments, configuration —… | 🟢 |  | ⚠️ |  |  |  |
| [require-strict-transport-security](https://eslint.interlace.tools/docs/security/plugin-express-security/rules/require-strict-transport-security?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-express-security) | CWE-319 | A02:2021 |  | This rule detects HSTS configurations that leave a downgrade window open — the header disabled, a max-age b… | 🟢 | 💼 |  |  |  |  |
<!-- AUTO-GENERATED:RULES_TABLE:END -->

## 🔗 Related ESLint Plugins

Part of the **Interlace ESLint Ecosystem** — AI-native security plugins with LLM-optimized error messages:

| Plugin                                                                                               |                                                                              Downloads                                                                               | Description                                                           |
| :--------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------: | :-------------------------------------------------------------------- |
| [`eslint-plugin-secure-coding`](https://www.npmjs.com/package/eslint-plugin-secure-coding)           |      [![downloads](https://img.shields.io/npm/dt/eslint-plugin-secure-coding.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-secure-coding)      | General security rules & OWASP guidelines.                            |
| [`eslint-plugin-pg`](https://www.npmjs.com/package/eslint-plugin-pg)                                 |                 [![downloads](https://img.shields.io/npm/dt/eslint-plugin-pg.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-pg)                 | PostgreSQL security & best practices.                                 |
| [`eslint-plugin-node-security`](https://www.npmjs.com/package/eslint-plugin-node-security)           |      [![downloads](https://img.shields.io/npm/dt/eslint-plugin-node-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-node-security)      | Node.js core-module security (fs, child_process, vm, crypto, Buffer). |
| [`eslint-plugin-jwt`](https://www.npmjs.com/package/eslint-plugin-jwt)                               |                [![downloads](https://img.shields.io/npm/dt/eslint-plugin-jwt.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-jwt)                | JWT security & best practices.                                        |
| [`eslint-plugin-browser-security`](https://www.npmjs.com/package/eslint-plugin-browser-security)     |   [![downloads](https://img.shields.io/npm/dt/eslint-plugin-browser-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-browser-security)   | Browser-specific security & XSS prevention.                           |
| [`eslint-plugin-express-security`](https://www.npmjs.com/package/eslint-plugin-express-security)     |   [![downloads](https://img.shields.io/npm/dt/eslint-plugin-express-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-express-security)   | Express.js security hardening rules.                                  |
| [`eslint-plugin-lambda-security`](https://www.npmjs.com/package/eslint-plugin-lambda-security)       |    [![downloads](https://img.shields.io/npm/dt/eslint-plugin-lambda-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-lambda-security)    | AWS Lambda security best practices.                                   |
| [`eslint-plugin-nestjs-security`](https://www.npmjs.com/package/eslint-plugin-nestjs-security)       |    [![downloads](https://img.shields.io/npm/dt/eslint-plugin-nestjs-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-nestjs-security)    | NestJS security rules & patterns.                                     |
| [`eslint-plugin-mongodb-security`](https://www.npmjs.com/package/eslint-plugin-mongodb-security)     |   [![downloads](https://img.shields.io/npm/dt/eslint-plugin-mongodb-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-mongodb-security)   | MongoDB security best practices.                                      |
| [`eslint-plugin-vercel-ai-security`](https://www.npmjs.com/package/eslint-plugin-vercel-ai-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-vercel-ai-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-vercel-ai-security) | Vercel AI SDK security hardening.                                     |
| [`eslint-plugin-import-next`](https://www.npmjs.com/package/eslint-plugin-import-next)               |        [![downloads](https://img.shields.io/npm/dt/eslint-plugin-import-next.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-import-next)        | Next-gen import sorting & architecture.                               |

<!-- INTERLACE:STAR_CTA:START -->

## ⭐ Support & follow

If this plugin caught a real bug for you, **[star the repo](https://github.com/ofri-peretz/eslint)** — stars are the signal that keeps the Interlace ESLint ecosystem maintained — and **[follow the writeups on Dev.to](https://dev.to/ofri-peretz)** for the benchmarks and security research behind these rules.

[![GitHub stars](https://img.shields.io/github/stars/ofri-peretz/eslint?style=social)](https://github.com/ofri-peretz/eslint)

<!-- INTERLACE:STAR_CTA:END -->

## 📄 License

MIT © [Ofri Peretz](https://github.com/ofri-peretz)

<p align="center">
  <a href="https://eslint.interlace.tools/docs/security/plugin-express-security?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-express-security"><img src="https://eslint.interlace.tools/images/og-express-security.png" alt="ESLint Interlace Plugin" width="100%" /></a>
</p>

<p align="center">
  <a href="https://eslint.interlace.tools/?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-express-security" target="blank"><img src="https://eslint.interlace.tools/icon-light.svg" alt="Interlace" height="70" /></a>
</p>
