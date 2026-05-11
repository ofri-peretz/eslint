<p align="center">
  <a href="https://eslint.interlace.tools" target="blank"><img src="https://eslint.interlace.tools/eslint-interlace-logo-light.svg" alt="ESLint Interlace Logo" width="120" /></a>
</p>

<p align="center">
  Browser-specific security rules to prevent XSS and other client-side attacks.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/eslint-plugin-browser-security" target="_blank"><img src="https://img.shields.io/npm/v/eslint-plugin-browser-security.svg" alt="NPM Version" /></a>
  <a href="https://www.npmjs.com/package/eslint-plugin-browser-security" target="_blank"><img src="https://img.shields.io/npm/dm/eslint-plugin-browser-security.svg" alt="NPM Downloads" /></a>
  <a href="https://opensource.org/licenses/MIT" target="_blank"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="Package License" /></a>
  <a href="https://app.codecov.io/gh/ofri-peretz/eslint/components?components%5B0%5D=browser-security" target="_blank"><img src="https://codecov.io/gh/ofri-peretz/eslint/graph/badge.svg?component=browser-security" alt="Codecov" /></a>
  <a href="https://github.com/ofri-peretz/eslint" target="_blank"><img src="https://img.shields.io/badge/Since-Dec_2025-blue?logo=rocket&logoColor=white" alt="Since Dec 2025" /></a>
</p>

## Description

This plugin provides Browser-specific security rules to prevent XSS and other client-side attacks.
By using this plugin, you can proactively identify and mitigate security risks across your entire codebase.

## Philosophy

**Interlace** fosters **strength through integration**. Instead of stacking isolated rules, we **interlace** security directly into your workflow to create a resilient fabric of code. We believe tools should **guide rather than gatekeep**, providing educational feedback that strengthens the developer with every interaction.

## Getting Started

- To check out the [guide](https://eslint.interlace.tools/docs/security/plugin-browser-security), visit [eslint.interlace.tools](https://eslint.interlace.tools). 📚
- 要查看中文 [指南](https://eslint.interlace.tools/docs/security/plugin-browser-security), 请访问 [eslint.interlace.tools](https://eslint.interlace.tools). 📚
- [가이드](https://eslint.interlace.tools/docs/security/plugin-browser-security) 문서는 [eslint.interlace.tools](https://eslint.interlace.tools)에서 확인하실 수 있습니다. 📚
- [ガイド](https://eslint.interlace.tools/docs/security/plugin-browser-security)は [eslint.interlace.tools](https://eslint.interlace.tools)でご確認ください。 📚
- Para ver la [guía](https://eslint.interlace.tools/docs/security/plugin-browser-security), visita [eslint.interlace.tools](https://eslint.interlace.tools). 📚
- للاطلاع على [الدليل](https://eslint.interlace.tools/docs/security/plugin-browser-security)، قم بزيارة [eslint.interlace.tools](https://eslint.interlace.tools). 📚

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
| ESLint | `^8.0.0 \|\| ^9.0.0 \|\| ^10.0.0` |
| Node.js | `>=18.0.0` |

See the [ESLint Version Support Policy](../../docs/ESLINT_VERSION_SUPPORT.md) — current ecosystem share data, the 20% gate, and the forward-looking exception that covers v10.

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
| [detect-mixed-content](https://eslint.interlace.tools/docs/security/plugin-browser-security/rules/detect-mixed-content) | CWE-311 |  |  | Detect HTTP resources in HTTPS pages |  |  |  |  |  |
| [no-allow-arbitrary-loads](https://eslint.interlace.tools/docs/security/plugin-browser-security/rules/no-allow-arbitrary-loads) | CWE-295 |  |  | Prevent configuration allowing insecure loads |  |  |  |  |  |
| [no-clickjacking](https://eslint.interlace.tools/docs/security/plugin-browser-security/rules/no-clickjacking) | CWE-1021 |  |  | Detects clickjacking vulnerabilities and missing frame protections |  |  |  |  |  |
| [no-client-side-auth-logic](https://eslint.interlace.tools/docs/security/plugin-browser-security/rules/no-client-side-auth-logic) |  |  |  | Prevent authentication logic in client code |  |  |  |  |  |
| [no-cookie-auth-tokens](https://eslint.interlace.tools/docs/security/plugin-browser-security/rules/no-cookie-auth-tokens) | CWE-1004 | A02:2025 |  | Disallow storing auth tokens in cookies via JavaScript |  |  |  |  |  |
| [no-credentials-in-query-params](https://eslint.interlace.tools/docs/security/plugin-browser-security/rules/no-credentials-in-query-params) | CWE-598 |  |  | Disallow credentials in URL query parameters |  |  |  |  |  |
| [no-disabled-certificate-validation](https://eslint.interlace.tools/docs/security/plugin-browser-security/rules/no-disabled-certificate-validation) | CWE-295 |  |  | Prevent disabled SSL/TLS certificate validation |  |  |  |  |  |
| [no-dynamic-service-worker-url](https://eslint.interlace.tools/docs/security/plugin-browser-security/rules/no-dynamic-service-worker-url) | CWE-829 | A08:2025 |  | Disallow dynamic URLs in service worker registration |  |  |  |  |  |
| [no-eval](https://eslint.interlace.tools/docs/security/plugin-browser-security/rules/no-eval) | CWE-94 |  |  | Disallow eval(), Function(), and other code execution patterns | 💼 |  |  |  |  |
| [no-filereader-innerhtml](https://eslint.interlace.tools/docs/security/plugin-browser-security/rules/no-filereader-innerhtml) | CWE-693 | A03:2025 |  | Disallow using innerHTML or similar methods with FileReader data |  |  |  |  |  |
| [no-http-urls](https://eslint.interlace.tools/docs/security/plugin-browser-security/rules/no-http-urls) | CWE-319 |  |  | Disallow hardcoded HTTP URLs (require HTTPS) |  |  |  |  |  |
| [no-innerhtml](https://eslint.interlace.tools/docs/security/plugin-browser-security/rules/no-innerhtml) | CWE-79 |  |  | Disallow dangerous innerHTML/outerHTML assignments that can lead to XSS | 💼 |  |  |  |  |
| [no-insecure-redirects](https://eslint.interlace.tools/docs/security/plugin-browser-security/rules/no-insecure-redirects) | CWE-601 |  |  | Detects open redirect vulnerabilities |  |  |  |  |  |
| [no-insecure-websocket](https://eslint.interlace.tools/docs/security/plugin-browser-security/rules/no-insecure-websocket) | CWE-319 |  |  | Require secure WebSocket connections (wss://) |  |  |  |  |  |
| [no-jwt-in-storage](https://eslint.interlace.tools/docs/security/plugin-browser-security/rules/no-jwt-in-storage) | CWE-311 | A02:2025 |  | Disallow storing JWT tokens in localStorage or sessionStorage |  |  |  |  |  |
| [no-missing-cors-check](https://eslint.interlace.tools/docs/security/plugin-browser-security/rules/no-missing-cors-check) | CWE-346 |  |  | Detects missing CORS validation (wildcard CORS, missing origin check) |  |  |  |  |  |
| [no-missing-csrf-protection](https://eslint.interlace.tools/docs/security/plugin-browser-security/rules/no-missing-csrf-protection) | CWE-352 |  |  | Detects missing CSRF token validation in POST/PUT/DELETE requests |  |  |  |  |  |
| [no-missing-security-headers](https://eslint.interlace.tools/docs/security/plugin-browser-security/rules/no-missing-security-headers) | CWE-693 |  |  | Detects missing security headers in HTTP responses |  |  |  |  |  |
| [no-password-in-url](https://eslint.interlace.tools/docs/security/plugin-browser-security/rules/no-password-in-url) | CWE-521 |  |  | Prevent passwords in URLs |  |  |  |  |  |
| [no-permissive-cors](https://eslint.interlace.tools/docs/security/plugin-browser-security/rules/no-permissive-cors) | CWE-942 |  |  | Prevent overly permissive CORS configuration |  |  |  |  |  |
| [no-postmessage-innerhtml](https://eslint.interlace.tools/docs/security/plugin-browser-security/rules/no-postmessage-innerhtml) | CWE-693 | A03:2025 |  | Disallow using innerHTML or similar methods with postMessage data |  |  |  |  |  |
| [no-postmessage-wildcard-origin](https://eslint.interlace.tools/docs/security/plugin-browser-security/rules/no-postmessage-wildcard-origin) | CWE-693 | A01:2025 |  | Disallow using wildcard (*) as targetOrigin in postMessage calls |  |  |  |  |  |
| [no-sensitive-cookie-js](https://eslint.interlace.tools/docs/security/plugin-browser-security/rules/no-sensitive-cookie-js) | CWE-359 | A02:2025 |  | Disallow storing sensitive data (tokens, passwords) in cookies via JavaScript |  |  |  |  |  |
| [no-sensitive-data-in-analytics](https://eslint.interlace.tools/docs/security/plugin-browser-security/rules/no-sensitive-data-in-analytics) | CWE-359 |  |  | Prevent PII being sent to analytics services |  |  |  |  |  |
| [no-sensitive-data-in-cache](https://eslint.interlace.tools/docs/security/plugin-browser-security/rules/no-sensitive-data-in-cache) | CWE-200 |  |  | Prevent caching sensitive data without encryption |  |  |  |  |  |
| [no-sensitive-indexeddb](https://eslint.interlace.tools/docs/security/plugin-browser-security/rules/no-sensitive-indexeddb) | CWE-922 | A02:2025 |  | Disallow storing sensitive data in IndexedDB |  |  |  |  |  |
| [no-sensitive-localstorage](https://eslint.interlace.tools/docs/security/plugin-browser-security/rules/no-sensitive-localstorage) | CWE-922 |  |  | Disallow storing sensitive data like tokens and passwords in localStorage |  |  |  |  |  |
| [no-sensitive-sessionstorage](https://eslint.interlace.tools/docs/security/plugin-browser-security/rules/no-sensitive-sessionstorage) | CWE-922 | A02:2025 |  | Disallow storing sensitive data in sessionStorage |  |  |  |  |  |
| [no-tracking-without-consent](https://eslint.interlace.tools/docs/security/plugin-browser-security/rules/no-tracking-without-consent) | CWE-359 |  |  | Require consent before analytics tracking |  |  |  |  |  |
| [no-unencrypted-transmission](https://eslint.interlace.tools/docs/security/plugin-browser-security/rules/no-unencrypted-transmission) | CWE-319 |  |  | Detects unencrypted data transmission (HTTP vs HTTPS, plain text protocols) |  |  |  |  |  |
| [no-unescaped-url-parameter](https://eslint.interlace.tools/docs/security/plugin-browser-security/rules/no-unescaped-url-parameter) | CWE-79 |  |  | Detects unescaped URL parameters |  |  |  |  |  |
| [no-unsafe-eval-csp](https://eslint.interlace.tools/docs/security/plugin-browser-security/rules/no-unsafe-eval-csp) | CWE-95 | A03:2025 |  | Refactor code to avoid eval() and remove unsafe-eval from CSP |  |  |  |  |  |
| [no-unsafe-inline-csp](https://eslint.interlace.tools/docs/security/plugin-browser-security/rules/no-unsafe-inline-csp) | CWE-79 | A03:2025 |  | Replace unsafe-inline with nonces or hashes |  |  |  |  |  |
| [no-unvalidated-deeplinks](https://eslint.interlace.tools/docs/security/plugin-browser-security/rules/no-unvalidated-deeplinks) | CWE-939 |  |  | Require validation of deep link URLs |  |  |  |  |  |
| [no-websocket-eval](https://eslint.interlace.tools/docs/security/plugin-browser-security/rules/no-websocket-eval) | CWE-319 | A03:2025 |  | Disallow using eval() or Function() with WebSocket message data |  |  |  |  |  |
| [no-websocket-innerhtml](https://eslint.interlace.tools/docs/security/plugin-browser-security/rules/no-websocket-innerhtml) | CWE-319 | A03:2025 |  | Disallow using innerHTML or similar methods with WebSocket message data |  |  |  |  |  |
| [no-worker-message-innerhtml](https://eslint.interlace.tools/docs/security/plugin-browser-security/rules/no-worker-message-innerhtml) | CWE-79 | A03:2025 |  | Disallow using innerHTML with Web Worker message data |  |  |  |  |  |
| [require-blob-url-revocation](https://eslint.interlace.tools/docs/security/plugin-browser-security/rules/require-blob-url-revocation) | CWE-401 | A04:2025 |  | Require revoking Blob URLs to prevent memory leaks |  |  |  |  |  |
| [require-cookie-secure-attrs](https://eslint.interlace.tools/docs/security/plugin-browser-security/rules/require-cookie-secure-attrs) | CWE-614 | A05:2025 |  | Require Secure and SameSite attributes when setting cookies |  |  |  |  |  |
| [require-csp-headers](https://eslint.interlace.tools/docs/security/plugin-browser-security/rules/require-csp-headers) | CWE-1021 |  |  | Require Content Security Policy headers |  |  |  |  |  |
| [require-https-only](https://eslint.interlace.tools/docs/security/plugin-browser-security/rules/require-https-only) | CWE-319 |  |  | Enforce HTTPS for all external requests |  |  |  |  |  |
| [require-mime-type-validation](https://eslint.interlace.tools/docs/security/plugin-browser-security/rules/require-mime-type-validation) | CWE-434 |  |  | Require MIME type validation for file uploads |  |  |  |  |  |
| [require-postmessage-origin-check](https://eslint.interlace.tools/docs/security/plugin-browser-security/rules/require-postmessage-origin-check) | CWE-346 |  |  | Require origin validation in postMessage event listeners |  |  |  |  |  |
| [require-url-validation](https://eslint.interlace.tools/docs/security/plugin-browser-security/rules/require-url-validation) | CWE-601 |  |  | Enforce URL validation before navigation |  |  |  |  |  |
| [require-websocket-wss](https://eslint.interlace.tools/docs/security/plugin-browser-security/rules/require-websocket-wss) | CWE-319 | A02:2025 |  | Require secure WebSocket connections (wss://) instead of unencrypted (ws://) |  |  |  |  |  |

## 🔗 Related ESLint Plugins

Part of the **Interlace ESLint Ecosystem** — AI-native security plugins with LLM-optimized error messages:

| Plugin | Downloads | Description |
| :--- | :---: | :--- |
| [`eslint-plugin-secure-coding`](https://www.npmjs.com/package/eslint-plugin-secure-coding) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-secure-coding.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-secure-coding) | General security rules & OWASP guidelines. |
| [`eslint-plugin-pg`](https://www.npmjs.com/package/eslint-plugin-pg) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-pg.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-pg) | PostgreSQL security & best practices. |
| [`eslint-plugin-crypto`](https://www.npmjs.com/package/eslint-plugin-crypto) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-crypto.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-crypto) | NodeJS Cryptography security rules. |
| [`eslint-plugin-jwt`](https://www.npmjs.com/package/eslint-plugin-jwt) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-jwt.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-jwt) | JWT security & best practices. |
| [`eslint-plugin-browser-security`](https://www.npmjs.com/package/eslint-plugin-browser-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-browser-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-browser-security) | Browser-specific security & XSS prevention. |
| [`eslint-plugin-express-security`](https://www.npmjs.com/package/eslint-plugin-express-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-express-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-express-security) | Express.js security hardening rules. |
| [`eslint-plugin-lambda-security`](https://www.npmjs.com/package/eslint-plugin-lambda-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-lambda-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-lambda-security) | AWS Lambda security best practices. |
| [`eslint-plugin-nestjs-security`](https://www.npmjs.com/package/eslint-plugin-nestjs-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-nestjs-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-nestjs-security) | NestJS security rules & patterns. |
| [`eslint-plugin-mongodb-security`](https://www.npmjs.com/package/eslint-plugin-mongodb-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-mongodb-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-mongodb-security) | MongoDB security best practices. |
| [`eslint-plugin-vercel-ai-security`](https://www.npmjs.com/package/eslint-plugin-vercel-ai-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-vercel-ai-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-vercel-ai-security) | Vercel AI SDK security hardening. |
| [`eslint-plugin-import-next`](https://www.npmjs.com/package/eslint-plugin-import-next) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-import-next.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-import-next) | Next-gen import sorting & architecture. |

## 📄 License

MIT © [Ofri Peretz](https://github.com/ofri-peretz)

<p align="center">
  <a href="https://eslint.interlace.tools/docs/security/plugin-browser-security"><img src="https://eslint.interlace.tools/images/og-browser-security.png" alt="ESLint Interlace Plugin" width="100%" /></a>
</p>