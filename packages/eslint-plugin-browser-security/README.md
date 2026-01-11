# eslint-plugin-browser-security

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
  <a href="https://github.com/ofri-peretz/eslint" target="_blank"><img src="https://img.shields.io/badge/Dec_2025-blue?logo=rocket&logoColor=white" alt="Dec 2025" /></a>
</p>

## Description

Browser-specific security rules to prevent XSS and other client-side attacks.

## Philosophy

**Interlace** fosters **strength through integration**. Instead of stacking isolated rules, we **interlace** security directly into your workflow to create a resilient fabric of code. We believe tools should **guide rather than gatekeep**, providing educational feedback that strengthens the developer with every interaction.

## Getting Started

- To check out the [guide](https://eslint.interlace.tools/docs/browser-security), visit [eslint.interlace.tools](https://eslint.interlace.tools). 📚
- 要查看中文 [指南](https://eslint.interlace.tools/docs/browser-security), 请访问 [eslint.interlace.tools](https://eslint.interlace.tools). 📚
- [가이드](https://eslint.interlace.tools/docs/browser-security) 문서는 [eslint.interlace.tools](https://eslint.interlace.tools)에서 확인하실 수 있습니다. 📚
- [ガイド](https://eslint.interlace.tools/docs/browser-security)は [eslint.interlace.tools](https://eslint.interlace.tools)でご確認ください。 📚

```bash
npm install eslint-plugin-browser-security --save-dev
```

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

## 🗂️ OWASP Coverage
| Rule                               | CWE |            OWASP            | CVSS | Description | 💼  | ⚠️  | 🔧  | 💡  | 🚫  |
| :--------------------------------- | :-: | :-------------------------: | :--: | :---------- | :-: | :-: | :-: | :-: | :-: |
| `no-eval`                          |     |       A03: Injection        |      |             |     |     |     |     |     |
| `no-innerhtml`                     |     |       A03: Injection        |      |             |     |     |     |     |     |
| `no-sensitive-localstorage`        |     | A02: Cryptographic Failures |      |             |     |     |     |     |     |
| `require-postmessage-origin-check` |     | A01: Broken Access Control  |      |             |     |     |     |     |     |

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

## 🔗 Related Packages
Part of the **Interlace ESLint Ecosystem** — AI-native security plugins with LLM-optimized error messages:

| Plugin                                                                                               | Downloads | Description |
| :--------------------------------------------------------------------------------------------------- | :-------: | :---------- |
| [`eslint-plugin-secure-coding`](https://www.npmjs.com/package/eslint-plugin-secure-coding)           |           |             |
| [`eslint-plugin-jwt`](https://www.npmjs.com/package/eslint-plugin-jwt)                               |           |             |
| [`eslint-plugin-crypto`](https://www.npmjs.com/package/eslint-plugin-crypto)                         |           |             |
| [`eslint-plugin-pg`](https://www.npmjs.com/package/eslint-plugin-pg)                                 |           |             |
| [`eslint-plugin-express-security`](https://www.npmjs.com/package/eslint-plugin-express-security)     |           |             |
| [`eslint-plugin-nestjs-security`](https://www.npmjs.com/package/eslint-plugin-nestjs-security)       |           |             |
| [`eslint-plugin-lambda-security`](https://www.npmjs.com/package/eslint-plugin-lambda-security)       |           |             |
| [`eslint-plugin-vercel-ai-security`](https://www.npmjs.com/package/eslint-plugin-vercel-ai-security) |           |             |
| [`eslint-plugin-import-next`](https://www.npmjs.com/package/eslint-plugin-import-next)               |           |             |

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
| [no-eval](https://eslint.interlace.tools/docs/browser-security/rules/no-eval) | CWE-95 | A03:2025 | 9.8 | [no-eval](./docs/rules/no-eval.md) |  | ⚠️ |  | 💡 | 🚫 |
| [no-innerhtml](https://eslint.interlace.tools/docs/browser-security/rules/no-innerhtml) | CWE-79 | A03:2025 | 6.1 | [no-innerhtml](./docs/rules/no-innerhtml.md) |  | ⚠️ |  | 💡 |  |
| [require-postmessage-origin-check](https://eslint.interlace.tools/docs/browser-security/rules/require-postmessage-origin-check) | CWE-346 | A01:2025 | 8.8 | [require-postmessage-origin-check](./docs/rules/require-postmessage-origin-check.md) |  | ⚠️ |  |  |  |
| [no-postmessage-wildcard-origin](https://eslint.interlace.tools/docs/browser-security/rules/no-postmessage-wildcard-origin) | CWE-346 | A01:2025 | 8.8 | [no-postmessage-wildcard-origin](./docs/rules/no-postmessage-wildcard-origin.md) |  | ⚠️ |  |  |  |
| [no-postmessage-innerhtml](https://eslint.interlace.tools/docs/browser-security/rules/no-postmessage-innerhtml) | CWE-79 | A03:2025 | 6.1 | [no-postmessage-innerhtml](./docs/rules/no-postmessage-innerhtml.md) |  | ⚠️ |  |  |  |
| [no-sensitive-localstorage](https://eslint.interlace.tools/docs/browser-security/rules/no-sensitive-localstorage) | CWE-922 | A02:2025 | 7.5 | [no-sensitive-localstorage](./docs/rules/no-sensitive-localstorage.md) | 💼 | ⚠️ |  | 💡 |  |
| [no-sensitive-sessionstorage](https://eslint.interlace.tools/docs/browser-security/rules/no-sensitive-sessionstorage) | CWE-922 | A02:2025 | 7.5 | [no-sensitive-sessionstorage](./docs/rules/no-sensitive-sessionstorage.md) | 💼 | ⚠️ |  | 💡 |  |
| [no-sensitive-indexeddb](https://eslint.interlace.tools/docs/browser-security/rules/no-sensitive-indexeddb) | CWE-922 | A02:2025 | 7.5 | [no-sensitive-indexeddb](./docs/rules/no-sensitive-indexeddb.md) | 💼 | ⚠️ |  | 💡 |  |
| [no-jwt-in-storage](https://eslint.interlace.tools/docs/browser-security/rules/no-jwt-in-storage) | CWE-922 | A02:2025 | 7.5 | [no-jwt-in-storage](./docs/rules/no-jwt-in-storage.md) | 💼 | ⚠️ |  | 💡 |  |
| [no-sensitive-cookie-js](https://eslint.interlace.tools/docs/browser-security/rules/no-sensitive-cookie-js) | CWE-1004 | A02:2025 | 5.3 | [no-sensitive-cookie-js](./docs/rules/no-sensitive-cookie-js.md) | 💼 | ⚠️ |  | 💡 |  |
| [no-cookie-auth-tokens](https://eslint.interlace.tools/docs/browser-security/rules/no-cookie-auth-tokens) | CWE-1004 | A02:2025 | 5.3 | [no-cookie-auth-tokens](./docs/rules/no-cookie-auth-tokens.md) | 💼 | ⚠️ |  | 💡 |  |
| [require-cookie-secure-attrs](https://eslint.interlace.tools/docs/browser-security/rules/require-cookie-secure-attrs) | CWE-614 | A05:2025 | 5.3 | [require-cookie-secure-attrs](./docs/rules/require-cookie-secure-attrs.md) |  | ⚠️ |  |  | 🚫 |
| [require-websocket-wss](https://eslint.interlace.tools/docs/browser-security/rules/require-websocket-wss) | CWE-319 | A02:2025 | 7.5 | [require-websocket-wss](./docs/rules/require-websocket-wss.md) | 💼 | ⚠️ |  | 💡 | 🚫 |
| [no-websocket-innerhtml](https://eslint.interlace.tools/docs/browser-security/rules/no-websocket-innerhtml) | CWE-79 | A03:2025 | 6.1 | [no-websocket-innerhtml](./docs/rules/no-websocket-innerhtml.md) | 💼 | ⚠️ |  | 💡 |  |
| [no-websocket-eval](https://eslint.interlace.tools/docs/browser-security/rules/no-websocket-eval) | CWE-95 | A03:2025 | 9.8 | [no-websocket-eval](./docs/rules/no-websocket-eval.md) | 💼 | ⚠️ |  | 💡 |  |
| [no-filereader-innerhtml](https://eslint.interlace.tools/docs/browser-security/rules/no-filereader-innerhtml) | CWE-79 | A03:2025 | 6.1 | [no-filereader-innerhtml](./docs/rules/no-filereader-innerhtml.md) | 💼 | ⚠️ |  | 💡 |  |
| [require-blob-url-revocation](https://eslint.interlace.tools/docs/browser-security/rules/require-blob-url-revocation) | CWE-401 | A04:2025 | 5.3 | [require-blob-url-revocation](./docs/rules/require-blob-url-revocation.md) |  | ⚠️ |  | 💡 |  |
| [no-dynamic-service-worker-url](https://eslint.interlace.tools/docs/browser-security/rules/no-dynamic-service-worker-url) | CWE-829 | A08:2025 | 7.5 | [no-dynamic-service-worker-url](./docs/rules/no-dynamic-service-worker-url.md) | 💼 | ⚠️ |  | 💡 |  |
| [no-worker-message-innerhtml](https://eslint.interlace.tools/docs/browser-security/rules/no-worker-message-innerhtml) | CWE-79 | A03:2025 | 6.1 | [no-worker-message-innerhtml](./docs/rules/no-worker-message-innerhtml.md) | 💼 | ⚠️ |  |  |  |
| [no-unsafe-inline-csp](https://eslint.interlace.tools/docs/browser-security/rules/no-unsafe-inline-csp) | CWE-79 | A03:2025 | 6.1 | [no-unsafe-inline-csp](./docs/rules/no-unsafe-inline-csp.md) | 💼 | ⚠️ |  | 💡 |  |
| [no-unsafe-eval-csp](https://eslint.interlace.tools/docs/browser-security/rules/no-unsafe-eval-csp) | CWE-95 | A03:2025 | 9.8 | [no-unsafe-eval-csp](./docs/rules/no-unsafe-eval-csp.md) | 💼 | ⚠️ |  | 💡 |  |

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
  <a href="https://eslint.interlace.tools/docs/browser-security"><img src="https://eslint.interlace.tools/images/og-browser-security.png" alt="ESLint Interlace Plugin" width="100%" /></a>
</p>