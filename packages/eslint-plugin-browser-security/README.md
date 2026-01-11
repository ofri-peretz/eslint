# eslint-plugin-browser-security

<p align="center">
  <a href="https://eslint.interlace.tools" target="blank"><img src="https://eslint.interlace.tools/eslint-interlace-logo-light.svg" alt="ESLint Interlace Logo" width="120" /></a>
</p>

<p align="center">
  Browser-specific security rules to prevent XSS and other client-side attacks.
</p>

[![npm version](https://img.shields.io/npm/v/eslint-plugin-browser-security.svg)](https://www.npmjs.com/package/eslint-plugin-browser-security)
[![npm downloads](https://img.shields.io/npm/dm/eslint-plugin-browser-security.svg)](https://www.npmjs.com/package/eslint-plugin-browser-security)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![codecov](https://codecov.io/gh/ofri-peretz/eslint/graph/badge.svg?component=browser_security)](https://app.codecov.io/gh/ofri-peretz/eslint/components?components%5B0%5D=browser_security)
[![Dec 2025](https://img.shields.io/badge/Dec_2025-blue?logo=rocket&logoColor=white)](https://github.com/ofri-peretz/eslint)

## Description

> **📘 Full Documentation:** [https://eslint.interlace.tools/docs/browser-security](https://eslint.interlace.tools/docs/browser-security)
>
> 🔐 Security-focused ESLint plugin for browser applications. Detects XSS vulnerabilities, postMessage abuse, storage API token exposure, cookie security issues, WebSocket vulnerabilities, and more.

> [!TIP]
> For **complete OWASP coverage**, combine with [`eslint-plugin-secure-coding`](https://www.npmjs.com/package/eslint-plugin-secure-coding) which provides 78 additional rules covering all OWASP categories.

## Philosophy
 
**Interlace** fosters **strength through integration**. Instead of stacking isolated rules, we **interlace** security directly into your workflow to create a resilient fabric of code. We believe tools should **guide rather than gatekeep**, providing educational feedback that strengthens the developer with every interaction.

## Getting Started

```bash
npm install eslint-plugin-browser-security --save-dev
```

<p align="center">
  <a href="https://eslint.interlace.tools" target="blank"><img src="https://eslint.interlace.tools/eslint-interlace-logo-light.svg" alt="ESLint Interlace Logo" width="120" /></a>
</p>

<p align="center">
  Browser-specific security rules to prevent XSS and other client-side attacks.
</p>

## Description

## Getting Started

```bash
npm install eslint-plugin-browser-security --save-dev
```

<p align="center">
  <a href="https://eslint.interlace.tools" target="blank"><img src="https://eslint.interlace.tools/eslint-interlace-logo.svg" alt="ESLint Interlace Logo" width="120" /></a>
</p>

<p align="center">
  Browser-specific security rules to prevent XSS and other client-side attacks.
</p>

## Description

## Getting Started

```bash
npm install eslint-plugin-browser-security --save-dev
```

<p align="center">
  <a href="https://eslint.interlace.tools" target="blank"><img src="https://eslint.interlace.tools/eslint-interlace-logo.svg" alt="ESLint Interlace Logo" width="120" /></a>
</p>

<p align="center">
  Browser-specific security rules to prevent XSS and other client-side attacks.
</p>

## Description

## Getting Started

```bash
npm install eslint-plugin-browser-security --save-dev
```

<p align="center">
  <a href="https://eslint.interlace.tools" target="blank"><img src="https://eslint.interlace.tools/eslint-interlace-logo.svg" alt="ESLint Interlace Logo" width="120" /></a>
</p>

<p align="center">
  Browser-specific security rules to prevent XSS and other client-side attacks.
</p>
## Description

## Getting Started

```bash
npm install eslint-plugin-browser-security --save-dev
```

<p align="center">
  <a href="https://eslint.interlace.tools" target="blank"><img src="https://eslint.interlace.tools/eslint-interlace-logo.svg" alt="ESLint Interlace Logo" width="120" /></a>
</p>

<p align="center">
  Browser-specific security rules to prevent XSS and other client-side attacks.
</p>
## Description

## Getting Started

```bash
npm install eslint-plugin-browser-security --save-dev
```

<p align="center">
  <a href="https://eslint.interlace.tools" target="blank"><img src="https://eslint.interlace.tools/eslint-interlace-logo.svg" alt="ESLint Interlace Logo" width="120" /></a>
</p>

Browser-specific security rules to prevent XSS and other client-side attacks.

## Description

## Getting Started

```bash
npm install eslint-plugin-browser-security --save-dev
```

Browser-specific security rules to prevent XSS and other client-side attacks.

## Description

## Getting Started

```bash
npm install eslint-plugin-browser-security --save-dev
```

---

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

## 📦 Installation

```bash
npm install eslint-plugin-browser-security --save-dev
# or
pnpm add -D eslint-plugin-browser-security
# or
yarn add -D eslint-plugin-browser-security
```

## 🚀 Quick Start

### Flat Config (ESLint 9+)

```javascript
// eslint.config.js
import browserSecurity from 'eslint-plugin-browser-security';

export default [
  {
    plugins: {
      'browser-security': browserSecurity,
    },
    rules: {
      'browser-security/no-eval': 'error',
      'browser-security/no-innerhtml': 'error',
      'browser-security/no-sensitive-localstorage': 'error',
      'browser-security/require-postmessage-origin-check': 'error',
    },
  },
];
```

### Using Recommended Config

```javascript
// eslint.config.js
import browserSecurity from 'eslint-plugin-browser-security';

export default [browserSecurity.configs.recommended];
```

## Rules
| Rule | Tag | CWE | OWASP | CVSS | Description | 💼 | ⚠️ | 🔧 | 💡 | 🚫 |
| :--- | :--- | :---: | :---: | :---: | :--- | :-: | :-: | :-: | :-: | :-: |
|  Rule                                                                                  | General |  Tag      |    CWE    |         OWASP          |    CVSS    |  Description  |      💼       |                           ⚠️                            |  🔧   |  💡   |  🚫   |
|  Rule                                                                                  | General |  General  |    Tag    |          CWE           |   OWASP    |  CVSS         |  Description  |                           💼                            |  ⚠️   |  🔧   |  💡   |  🚫   |
|  Rule                                                                                  | General |  General  |  General  |          Tag           |    CWE     |  OWASP        |     CVSS      |                       Description                       |  💼   |  ⚠️   |  🔧   |  💡   |  🚫   |
|  [no-eval](./docs/rules/no-eval.md)                                                    | General |  General  |  General  |     XSS Prevention     |   CWE-95   |  A03:2021     |      9.8      |  Prevent code injection via `eval()`, `new Function()`  |  ⚠️   |  💡   |  🚫   |
|  [no-innerhtml](./docs/rules/no-innerhtml.md)                                          | General |  General  |  General  |     XSS Prevention     |   CWE-79   |  A03:2021     |      6.1      |        Prevent XSS via `innerHTML`, `outerHTML`         |  ⚠️   |  💡   |
|  [require-postmessage-origin-check](./docs/rules/require-postmessage-origin-check.md)  | General |  General  |  General  |  postMessage Security  |  CWE-346   |  A01:2021     |      8.8      |    Require origin validation in postMessage handlers    |  ⚠️   |   �   |   �   |
|  [no-postmessage-wildcard-origin](./docs/rules/no-postmessage-wildcard-origin.md)      | General |  General  |  General  |  postMessage Security  |  CWE-346   |  A01:2021     |      8.8      |      Prevent wildcard targetOrigin in postMessage       |  ⚠️   |   �   |   �   |
|  [no-postmessage-innerhtml](./docs/rules/no-postmessage-innerhtml.md)                  | General |  General  |  General  |  postMessage Security  |   CWE-79   |  A03:2021     |      6.1      |    Prevent XSS via innerHTML in postMessage handlers    |  ⚠️   |
|  [no-sensitive-localstorage](./docs/rules/no-sensitive-localstorage.md)                | General |  General  |  General  |    Storage Security    |  CWE-922   |  A02:2021     |      7.5      |         Prevent sensitive data in localStorage          |  💼   |  ⚠️   |  💡   |
|  [no-sensitive-sessionstorage](./docs/rules/no-sensitive-sessionstorage.md)            | General |  General  |  General  |    Storage Security    |  CWE-922   |  A02:2021     |      7.5      |        Prevent sensitive data in sessionStorage         |  💼   |  ⚠️   |  💡   |
|  [no-sensitive-indexeddb](./docs/rules/no-sensitive-indexeddb.md)                      | General |  General  |  General  |    Storage Security    |  CWE-922   |  A02:2021     |      7.5      |           Prevent sensitive data in IndexedDB           |  💼   |  ⚠️   |  💡   |
|  [no-jwt-in-storage](./docs/rules/no-jwt-in-storage.md)                                | General |  General  |  General  |    Storage Security    |  CWE-922   |  A02:2021     |      7.5      |          Prevent JWT tokens in browser storage          |  💼   |  ⚠️   |  💡   |
|  [no-sensitive-cookie-js](./docs/rules/no-sensitive-cookie-js.md)                      | General |  General  |  General  |    Cookie Security     |  CWE-1004  |  A02:2021     |      5.3      |        Prevent sensitive data in cookies via JS         |  💼   |  ⚠️   |  💡   |
|  [no-cookie-auth-tokens](./docs/rules/no-cookie-auth-tokens.md)                        | General |  General  |  General  |    Cookie Security     |  CWE-1004  |  A02:2021     |      5.3      |      Prevent auth tokens in JS-accessible cookies       |  💼   |  ⚠️   |  💡   |
|  [require-cookie-secure-attrs](./docs/rules/require-cookie-secure-attrs.md)            | General |  General  |  General  |    Cookie Security     |  CWE-614   |  A05:2021     |      5.3      |         Require Secure and SameSite attributes          |  ⚠️   |  🚫   |
|  [require-websocket-wss](./docs/rules/require-websocket-wss.md)                        | General |  General  |  General  |   WebSocket Security   |  CWE-319   |  A02:2021     |      7.5      |            Require secure WebSocket (wss://)            |  💼   |  ⚠️   |  💡   |  🚫   |
|  [no-websocket-innerhtml](./docs/rules/no-websocket-innerhtml.md)                      | General |  General  |  General  |   WebSocket Security   |   CWE-79   |  A03:2021     |      6.1      |            Prevent XSS in WebSocket handlers            |  💼   |  ⚠️   |  💡   |
|  [no-websocket-eval](./docs/rules/no-websocket-eval.md)                                | General |  General  |  General  |   WebSocket Security   |   CWE-95   |  A03:2021     |      9.8      |            Prevent RCE in WebSocket handlers            |  💼   |  ⚠️   |  💡   |
|  [no-filereader-innerhtml](./docs/rules/no-filereader-innerhtml.md)                    | General |  General  |  General  |   File API & Workers   |   CWE-79   |  A03:2021     |      6.1      |            Prevent XSS with FileReader data             |  💼   |  ⚠️   |  💡   |
|  [require-blob-url-revocation](./docs/rules/require-blob-url-revocation.md)            | General |  General  |  General  |   File API & Workers   |  CWE-401   |  A04:2021     |      5.3      |               Require revoking Blob URLs                |  ⚠️   |  💡   |
|  [no-dynamic-service-worker-url](./docs/rules/no-dynamic-service-worker-url.md)        | General |  General  |  General  |   File API & Workers   |  CWE-829   |  A08:2021     |      7.5      |           Prevent dynamic service worker URLs           |  💼   |  ⚠️   |  💡   |
|  [no-worker-message-innerhtml](./docs/rules/no-worker-message-innerhtml.md)            | General |  General  |  General  |   File API & Workers   |   CWE-79   |  A03:2021     |      6.1      |             Prevent XSS in Worker handlers              |  💼   |  ⚠️   |
|  [no-unsafe-inline-csp](./docs/rules/no-unsafe-inline-csp.md)                          | General |  General  |  General  |      CSP Security      |   CWE-79   |  A03:2021     |      6.1      |             Disallow 'unsafe-inline' in CSP             |  💼   |  ⚠️   |  💡   |
|  [no-unsafe-eval-csp](./docs/rules/no-unsafe-eval-csp.md)                              | General |  General  |  General  |      CSP Security      |   CWE-95   |  A03:2021     |      9.8      |              Disallow 'unsafe-eval' in CSP              |  💼   |  ⚠️   |  💡   |

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

## 📄 License

MIT © [Ofri Peretz](https://github.com/ofri-peretz)

<a href="https://eslint.interlace.tools/docs/browser-security"><img src="https://eslint.interlace.tools/images/og-browser.png" alt="ESLint Interlace Plugin" width="100%" /></a>