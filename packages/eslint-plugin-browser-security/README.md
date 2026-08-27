<p align="center">
  <a href="https://eslint.interlace.tools/?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-browser-security" target="blank"><img src="https://eslint.interlace.tools/logos/interlace.svg" alt="Interlace" height="90" /></a>
  &nbsp;&nbsp;
  <a href="https://www.chromium.org" target="_blank"><img src="https://eslint.interlace.tools/logos/chromium.svg" alt="Chromium" height="90" /></a>
  &nbsp;&nbsp;
  <a href="https://oxc.rs" target="_blank"><img src="https://eslint.interlace.tools/logos/oxlint.svg" alt="oxlint" height="90" /></a>
  &nbsp;&nbsp;
  <a href="https://eslint.org" target="_blank"><img src="https://eslint.interlace.tools/logos/eslint.svg" alt="ESLint" height="90" /></a>
</p>

<p align="center">
  Browser-specific security rules to prevent XSS and other client-side attacks.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/eslint-plugin-browser-security" target="_blank"><img src="https://img.shields.io/npm/v/eslint-plugin-browser-security.svg" alt="NPM Version" /></a>
  <a href="https://www.npmjs.com/package/eslint-plugin-browser-security" target="_blank"><img src="https://img.shields.io/npm/dm/eslint-plugin-browser-security.svg" alt="NPM Downloads" /></a>
  <a href="https://opensource.org/licenses/MIT" target="_blank"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="Package License" /></a>
  <a href="https://app.codecov.io/gh/ofri-peretz/eslint/components?components%5B0%5D=eslint-plugin-browser-security" target="_blank"><img src="https://codecov.io/gh/ofri-peretz/eslint/graph/badge.svg?component=eslint-plugin-browser-security" alt="Codecov" /></a>
  <a href="https://github.com/ofri-peretz/eslint" target="_blank"><img src="https://img.shields.io/badge/Since-Dec_2025-blue?logo=rocket&logoColor=white" alt="Since Dec 2025" /></a>
  <a href="https://scorecard.dev/viewer/?uri=github.com/ofri-peretz/eslint" target="_blank"><img src="https://api.securityscorecards.dev/projects/github.com/ofri-peretz/eslint/badge" alt="OpenSSF Scorecard" /></a>
</p>

> ⭐ If this plugin caught a real bug for you, [**star the repo**](https://github.com/ofri-peretz/eslint) — it's the signal that keeps these rules maintained.

## Description

This plugin provides Browser-specific security rules to prevent XSS and other client-side attacks.

## Philosophy

**Interlace** fosters **strength through integration**. Instead of stacking isolated rules, we **interlace** security directly into your workflow to create a resilient fabric of code. We believe tools should **guide rather than gatekeep**, providing educational feedback that strengthens the developer with every interaction.

<!-- AUTO-GENERATED:DOCTRINE:START - Do not edit manually -->

**Every rule here is built to be worth reading.** A linter that reports a thousand
things a week gets switched off in a month, and the real finding goes with it — so a
rule fires on what the code *does*, resolved through the AST and ESLint's own scope
analysis, never on an identifier that happens to contain `query` or a path that
contains `key`. Every finding carries its fix on the message, in prose for a human and
as structured JSON for an agent; security rules add a CWE mapping and, where one is
assigned, a CVSS score.

That trade costs recall, and we measure what it costs rather than assuming it is free:
[benchmark methodology](https://github.com/ofri-peretz/eslint/blob/main/BENCHMARK-METHODOLOGY.md)
and [results](https://github.com/ofri-peretz/eslint/blob/main/BENCHMARK-RESULTS.md).
If a finding is wrong,
[open an issue](https://github.com/ofri-peretz/eslint/issues) — a false positive is a
bug here, not a tuning exercise for you.

<!-- AUTO-GENERATED:DOCTRINE:END -->

## Getting Started

- To check out the [guide](https://eslint.interlace.tools/docs/security/plugin-browser-security?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-browser-security), visit [eslint.interlace.tools](https://eslint.interlace.tools/?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-browser-security). 📚
- 要查看中文 [指南](https://eslint.interlace.tools/docs/security/plugin-browser-security?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-browser-security), 请访问 [eslint.interlace.tools](https://eslint.interlace.tools/?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-browser-security). 📚
- [가이드](https://eslint.interlace.tools/docs/security/plugin-browser-security?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-browser-security) 문서는 [eslint.interlace.tools](https://eslint.interlace.tools/?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-browser-security)에서 확인하실 수 있습니다. 📚
- [ガイド](https://eslint.interlace.tools/docs/security/plugin-browser-security?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-browser-security)は [eslint.interlace.tools](https://eslint.interlace.tools/?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-browser-security)でご確認ください。 📚
- Para ver la [guía](https://eslint.interlace.tools/docs/security/plugin-browser-security?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-browser-security), visita [eslint.interlace.tools](https://eslint.interlace.tools/?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-browser-security). 📚
- للاطلاع على [الدليل](https://eslint.interlace.tools/docs/security/plugin-browser-security?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-browser-security)، قم بزيارة [eslint.interlace.tools](https://eslint.interlace.tools/?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-browser-security). 📚

```bash
npm install eslint-plugin-browser-security --save-dev
```

## ⚙️ Configuration Presets
| Preset        | Description                                         |
| :------------ | :-------------------------------------------------- |
| `recommended` | Recommended security configuration                  |
| `strict`      | Strict security configuration - all rules as errors |

## 🤖 LLM-Optimized Messages
All rules include structured remediation guidance designed for AI assistants:

```
[browser-security/no-innerhtml] XSS vulnerability: Direct HTML assignment detected.

📋 CONTEXT:
  • Pattern: element.innerHTML = unsanitizedInput
  • Risk: Any script in unsanitizedInput will execute

🛠️ REMEDIATION:
  Option A (Preferred): Use textContent for plain text
    element.textContent = userInput;

  Option B: Sanitize before insertion
    element.innerHTML = DOMPurify.sanitize(userInput);

📚 References:
  • CWE-79: https://cwe.mitre.org/data/definitions/79.html
  • OWASP XSS Prevention: https://owasp.org/...
```

By providing this structured context (CWE, OWASP, Fix), we enable AI tools to **reason** about the security flaw rather than hallucinating. This allows Copilot/Cursor to suggest the _exact_ correct fix immediately.

## 💡 What You Get
- **21 security rules** targeting browser-specific vulnerabilities
- **XSS prevention** via DOM manipulation and dynamic content detection
- **Storage security** preventing sensitive data exposure in localStorage/sessionStorage/IndexedDB
- **Cross-origin protection** with postMessage origin validation
- **LLM-optimized messages** with CWE references and auto-fix suggestions
- **OWASP Top 10 coverage** for browser security patterns

## 🎯 Why This Plugin?
Modern browser applications face unique security challenges across storage APIs, cross-origin communication, and dynamic content rendering. This plugin provides static analysis rules specifically designed for browser security patterns:

- **XSS Prevention**: Detects dangerous DOM manipulation patterns
- **Storage Security**: Prevents sensitive data exposure in localStorage/sessionStorage/IndexedDB
- **Cross-Origin Protection**: Validates postMessage origin checks
- **Cookie Security**: Identifies insecure cookie handling in JavaScript
- **LLM-Optimized**: All rules include AI-friendly remediation guidance

## 🔍 Detection Examples
### ❌ Vulnerable Code

```javascript
// XSS via innerHTML
element.innerHTML = userInput;

// Code injection via eval
eval(dynamicCode);

// JWT in localStorage (XSS can steal it)
localStorage.setItem('token', jwt);

// postMessage without origin check
window.addEventListener('message', (event) => {
  processData(event.data); // Anyone can send messages!
});
```

### ✅ Secure Code

```javascript
// Safe text assignment
element.textContent = userInput;

// Or sanitize before HTML insertion
element.innerHTML = DOMPurify.sanitize(userInput);

// Use HttpOnly cookies for auth tokens (set by server)
// Server: Set-Cookie: token=xxx; HttpOnly; Secure; SameSite=Strict

// Origin validation
window.addEventListener('message', (event) => {
  if (event.origin !== 'https://trusted-domain.com') return;
  processData(event.data);
});
```

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
| [detect-mixed-content](https://eslint.interlace.tools/docs/security/plugin-browser-security/rules/detect-mixed-content?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-browser-security) | CWE-311 |  |  | Detects HTTP URLs in code that should use HTTPS, preventing mixed content vulnerabilities. | 🟢 | 💼 |  |  |  |  |
| [no-allow-arbitrary-loads](https://eslint.interlace.tools/docs/security/plugin-browser-security/rules/no-allow-arbitrary-loads?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-browser-security) | CWE-295 |  |  | Prevents disabling App Transport Security (ATS) by detecting NSAllowsArbitraryLoads: true in an Expo/React… | 🟢 | 💼 |  |  |  |  |
| [no-clickjacking](https://eslint.interlace.tools/docs/security/plugin-browser-security/rules/no-clickjacking?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-browser-security) | CWE-1021 |  |  | Detects clickjacking vulnerabilities and missing frame protections | 🟢 |  |  |  |  |  |
| [no-client-side-auth-logic](https://eslint.interlace.tools/docs/security/plugin-browser-security/rules/no-client-side-auth-logic?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-browser-security) |  |  |  | Prevent client-side authentication logic that can be bypassed. This rule is part of eslint-plugin-browser-s… | 🟢 | 💼 |  |  |  |  |
| [no-cookie-auth-tokens](https://eslint.interlace.tools/docs/security/plugin-browser-security/rules/no-cookie-auth-tokens?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-browser-security) | CWE-1004 | A02:2021 |  | Prevent storing authentication tokens in JavaScript-accessible cookies. | 🟢 | 💼 |  |  |  |  |
| [no-credentials-in-query-params](https://eslint.interlace.tools/docs/security/plugin-browser-security/rules/no-credentials-in-query-params?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-browser-security) | CWE-598 |  |  | CWE: [CWE-598](https://cwe.mitre.org/data/definitions/598.html) | 🟢 | 💼 |  |  |  |  |
| [no-disabled-certificate-validation](https://eslint.interlace.tools/docs/security/plugin-browser-security/rules/no-disabled-certificate-validation?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-browser-security) | CWE-295 |  |  | CWE: [CWE-295](https://cwe.mitre.org/data/definitions/295.html) | 🟢 | 💼 |  |  |  |  |
| [no-dynamic-service-worker-url](https://eslint.interlace.tools/docs/security/plugin-browser-security/rules/no-dynamic-service-worker-url?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-browser-security) | CWE-829 | A08:2021 |  | Prevent dynamic URLs in service worker registration. | 🟢 | 💼 |  |  |  |  |
| [no-eval](https://eslint.interlace.tools/docs/security/plugin-browser-security/rules/no-eval?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-browser-security) | CWE-94 |  |  | Detects dangerous eval() and similar code execution patterns | 🟢 | 💼 |  |  |  |  |
| [no-filereader-innerhtml](https://eslint.interlace.tools/docs/security/plugin-browser-security/rules/no-filereader-innerhtml?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-browser-security) | CWE-693 | A03:2021 |  | The rule provides LLM-optimized error messages (Compact 2-line format) with actionable security guidance: | 🟢 | 💼 |  |  |  |  |
| [no-http-urls](https://eslint.interlace.tools/docs/security/plugin-browser-security/rules/no-http-urls?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-browser-security) | CWE-319 |  |  | CWE: [CWE-319](https://cwe.mitre.org/data/definitions/319.html) | 🟢 | 💼 |  |  |  |  |
| [no-incomplete-url-sanitization](https://eslint.interlace.tools/docs/security/plugin-browser-security/rules/no-incomplete-url-sanitization?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-browser-security) | CWE-020 | A01:2021 |  | Disallow URL substring tests and partial scheme denylists as security decisions | 🟢 | 💼 |  |  |  |  |
| [no-innerhtml](https://eslint.interlace.tools/docs/security/plugin-browser-security/rules/no-innerhtml?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-browser-security) | CWE-79 |  |  | Detects dangerous innerHTML/outerHTML assignments that can lead to Cross-Site Scripting (XSS) | 🟢 | 💼 |  |  |  |  |
| [no-insecure-redirects](https://eslint.interlace.tools/docs/security/plugin-browser-security/rules/no-insecure-redirects?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-browser-security) | CWE-601 |  |  | ESLint Rule: no-insecure-redirects | 🟢 | 💼 |  |  |  |  |
| [no-insecure-websocket](https://eslint.interlace.tools/docs/security/plugin-browser-security/rules/no-insecure-websocket?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-browser-security) | CWE-319 |  |  | CWE: [CWE-319](https://cwe.mitre.org/data/definitions/319.html) | 🟢 | 💼 |  |  |  |  |
| [no-jwt-in-storage](https://eslint.interlace.tools/docs/security/plugin-browser-security/rules/no-jwt-in-storage?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-browser-security) | CWE-311 | A02:2021 |  | This rule prevents storing JWT tokens in browser storage (localStorage/sessionStorage) | 🟢 | 💼 |  |  |  |  |
| [no-missing-cors-check](https://eslint.interlace.tools/docs/security/plugin-browser-security/rules/no-missing-cors-check?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-browser-security) | CWE-346 |  |  | Detects missing CORS validation (wildcard CORS, missing origin check) that can allow unauthorized cross-ori… | 🟢 |  |  |  |  |  |
| [no-missing-csrf-protection](https://eslint.interlace.tools/docs/security/plugin-browser-security/rules/no-missing-csrf-protection?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-browser-security) | CWE-352 |  |  | Detects missing CSRF token validation in POST/PUT/DELETE requests | 🟢 |  |  |  |  |  |
| [no-missing-security-headers](https://eslint.interlace.tools/docs/security/plugin-browser-security/rules/no-missing-security-headers?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-browser-security) | CWE-693 |  |  | ESLint Rule: no-missing-security-headers | 🟢 |  |  |  |  |  |
| [no-password-in-url](https://eslint.interlace.tools/docs/security/plugin-browser-security/rules/no-password-in-url?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-browser-security) | CWE-521 |  |  | This rule detects when URLs contain password-related query parameters or URL fragments | 🟢 |  |  |  |  |  |
| [no-permissive-cors](https://eslint.interlace.tools/docs/security/plugin-browser-security/rules/no-permissive-cors?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-browser-security) | CWE-942 |  |  | CWE: [CWE-942](https://cwe.mitre.org/data/definitions/942.html) | 🟢 |  |  |  |  |  |
| [no-postmessage-innerhtml](https://eslint.interlace.tools/docs/security/plugin-browser-security/rules/no-postmessage-innerhtml?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-browser-security) | CWE-693 | A03:2021 |  | The rule provides LLM-optimized error messages (Compact 2-line format) with actionable security guidance: | 🟢 | 💼 |  |  |  |  |
| [no-postmessage-wildcard-origin](https://eslint.interlace.tools/docs/security/plugin-browser-security/rules/no-postmessage-wildcard-origin?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-browser-security) | CWE-693 | A01:2021 |  | This rule prevents using \\"\\" as the targetOrigin parameter in postMessage() calls | 🟢 | 💼 |  |  |  |  |
| [no-sensitive-cookie-js](https://eslint.interlace.tools/docs/security/plugin-browser-security/rules/no-sensitive-cookie-js?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-browser-security) | CWE-359 | A02:2021 |  | The rule provides LLM-optimized error messages (Compact 2-line format) with actionable security guidance: | 🟢 | 💼 |  |  |  |  |
| [no-sensitive-data-in-analytics](https://eslint.interlace.tools/docs/security/plugin-browser-security/rules/no-sensitive-data-in-analytics?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-browser-security) | CWE-359 |  |  | This rule detects when sensitive user data (email, SSN, credit card, password, phone, address) is passed to… | 🟢 |  |  |  |  |  |
| [no-sensitive-data-in-cache](https://eslint.interlace.tools/docs/security/plugin-browser-security/rules/no-sensitive-data-in-cache?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-browser-security) | CWE-200 |  |  | CWE: [CWE-200](https://cwe.mitre.org/data/definitions/200.html) | 🟢 |  |  |  |  |  |
| [no-sensitive-indexeddb](https://eslint.interlace.tools/docs/security/plugin-browser-security/rules/no-sensitive-indexeddb?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-browser-security) | CWE-922 | A02:2021 |  | Prevent storing sensitive data in IndexedDB. | 🟢 | 💼 |  |  |  |  |
| [no-sensitive-localstorage](https://eslint.interlace.tools/docs/security/plugin-browser-security/rules/no-sensitive-localstorage?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-browser-security) | CWE-922 |  |  | Detects storage of sensitive data (tokens, passwords, PII) in localStorage | 🟢 | 💼 |  |  |  |  |
| [no-sensitive-sessionstorage](https://eslint.interlace.tools/docs/security/plugin-browser-security/rules/no-sensitive-sessionstorage?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-browser-security) | CWE-922 | A02:2021 |  | Prevent storing sensitive data in sessionStorage. | 🟢 | 💼 |  |  |  |  |
| [no-tracking-without-consent](https://eslint.interlace.tools/docs/security/plugin-browser-security/rules/no-tracking-without-consent?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-browser-security) | CWE-359 |  |  | CWE: [CWE-359](https://cwe.mitre.org/data/definitions/359.html) | 🟢 |  |  |  |  |  |
| [no-unencrypted-transmission](https://eslint.interlace.tools/docs/security/plugin-browser-security/rules/no-unencrypted-transmission?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-browser-security) | CWE-319 |  |  | Detects unencrypted data transmission (HTTP vs HTTPS, plain text protocols) | 🟢 | 💼 |  |  |  |  |
| [no-unescaped-url-parameter](https://eslint.interlace.tools/docs/security/plugin-browser-security/rules/no-unescaped-url-parameter?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-browser-security) | CWE-79 |  |  | Detects unescaped URL parameters that can lead to Cross-Site Scripting (XSS) or open redirect vulnerabilities | 🟢 |  |  |  |  |  |
| [no-unsafe-eval-csp](https://eslint.interlace.tools/docs/security/plugin-browser-security/rules/no-unsafe-eval-csp?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-browser-security) | CWE-95 | A03:2021 |  | Disallow 'unsafe-eval' in Content Security Policy directives. | 🟢 | 💼 |  |  |  |  |
| [no-unsafe-inline-csp](https://eslint.interlace.tools/docs/security/plugin-browser-security/rules/no-unsafe-inline-csp?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-browser-security) | CWE-79 | A03:2021 |  | Disallow 'unsafe-inline' in Content Security Policy directives. | 🟢 | 💼 |  |  |  |  |
| [no-unvalidated-deeplinks](https://eslint.interlace.tools/docs/security/plugin-browser-security/rules/no-unvalidated-deeplinks?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-browser-security) | CWE-939 |  |  | This rule detects when deep link URLs are opened without validation in React Native or mobile web apps | 🟢 | 💼 |  |  |  |  |
| [no-websocket-eval](https://eslint.interlace.tools/docs/security/plugin-browser-security/rules/no-websocket-eval?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-browser-security) | CWE-319 | A03:2021 |  | The rule provides LLM-optimized error messages (Compact 2-line format) with actionable security guidance: | 🟢 | 💼 |  |  |  |  |
| [no-websocket-innerhtml](https://eslint.interlace.tools/docs/security/plugin-browser-security/rules/no-websocket-innerhtml?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-browser-security) | CWE-319 | A03:2021 |  | The rule provides LLM-optimized error messages (Compact 2-line format) with actionable security guidance: | 🟢 | 💼 |  |  |  |  |
| [no-worker-message-innerhtml](https://eslint.interlace.tools/docs/security/plugin-browser-security/rules/no-worker-message-innerhtml?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-browser-security) | CWE-79 | A03:2021 |  | Disallow using innerHTML with Web Worker message data. | 🟢 | 💼 |  |  |  |  |
| [require-blob-url-revocation](https://eslint.interlace.tools/docs/security/plugin-browser-security/rules/require-blob-url-revocation?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-browser-security) | CWE-401 | A04:2021 |  | Require revoking Blob URLs after use to prevent memory leaks. | 🟢 |  | ⚠️ |  |  |  |
| [require-cookie-secure-attrs](https://eslint.interlace.tools/docs/security/plugin-browser-security/rules/require-cookie-secure-attrs?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-browser-security) | CWE-614 | A05:2021 |  | Require Secure and SameSite attributes on cookies. | 🟢 | 💼 |  |  |  |  |
| [require-csp-headers](https://eslint.interlace.tools/docs/security/plugin-browser-security/rules/require-csp-headers?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-browser-security) | CWE-1021 |  |  | CWE: [CWE-1021](https://cwe.mitre.org/data/definitions/1021.html) | 🟢 |  |  |  |  |  |
| [require-https-only](https://eslint.interlace.tools/docs/security/plugin-browser-security/rules/require-https-only?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-browser-security) | CWE-319 |  |  | This rule detects HTTP (unencrypted) URLs in fetch() and axios requests | 🟢 | 💼 |  |  |  |  |
| [require-mime-type-validation](https://eslint.interlace.tools/docs/security/plugin-browser-security/rules/require-mime-type-validation?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-browser-security) | CWE-434 |  |  | CWE: [CWE-434](https://cwe.mitre.org/data/definitions/434.html) | 🟢 |  |  |  |  |  |
| [require-postmessage-origin-check](https://eslint.interlace.tools/docs/security/plugin-browser-security/rules/require-postmessage-origin-check?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-browser-security) | CWE-346 |  |  | Detects postMessage event handlers without origin validation | 🟢 | 💼 |  |  |  |  |
| [require-url-validation](https://eslint.interlace.tools/docs/security/plugin-browser-security/rules/require-url-validation?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-browser-security) | CWE-601 |  |  | CWE: [CWE-601](https://cwe.mitre.org/data/definitions/601.html) | 🟢 |  |  |  |  |  |
| [require-websocket-wss](https://eslint.interlace.tools/docs/security/plugin-browser-security/rules/require-websocket-wss?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-browser-security) | CWE-319 | A02:2021 |  | This rule enforces the use of wss:// (WebSocket Secure) protocol instead of ws:// (unencrypted WebSocket) | 🟢 | 💼 |  |  |  |  |
<!-- AUTO-GENERATED:RULES_TABLE:END -->
<!-- AUTO-GENERATED:ECOSYSTEM_TABLE:START - Do not edit manually -->

## 🔗 Related ESLint Plugins

Part of the **Interlace ESLint ecosystem** — AI-native rules with LLM-optimized error messages:

**Security**

| Plugin | Downloads | Description |
| :--- | :---: | :--- |
| [`eslint-plugin-anthropic-security`](https://www.npmjs.com/package/eslint-plugin-anthropic-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-anthropic-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-anthropic-security) | Anthropic SDK security. |
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
  <a href="https://eslint.interlace.tools/docs/security/plugin-browser-security?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-browser-security"><img src="https://eslint.interlace.tools/images/og-browser-security.png" alt="ESLint Interlace Plugin" width="100%" /></a>
</p>

<p align="center">
  <a href="https://eslint.interlace.tools/?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-browser-security" target="blank"><img src="https://eslint.interlace.tools/icon-light.svg" alt="Interlace" height="70" /></a>
</p>
