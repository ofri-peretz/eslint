# eslint-plugin-browser-security

> 🔐 Security-focused ESLint plugin for browser applications. Detects XSS vulnerabilities, postMessage abuse, storage API token exposure, cookie security issues, WebSocket vulnerabilities, and more.

[![npm version](https://img.shields.io/npm/v/eslint-plugin-browser-security.svg)](https://www.npmjs.com/package/eslint-plugin-browser-security)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![codecov](https://codecov.io/gh/ofri-peretz/eslint/graph/badge.svg?component=browser_security)](https://app.codecov.io/gh/ofri-peretz/eslint/components?components%5B0%5D=browser_security)

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

## 🔐 Rules (21 total)

💼 = Set in `recommended` | 🔧 = Auto-fixable | 💡 = Has suggestions

### XSS Prevention

| Rule                                         | CWE    | OWASP    | Description                                           | 💼  | 🔧  | 💡  |
| -------------------------------------------- | ------ | -------- | ----------------------------------------------------- | --- | --- | --- |
| [no-eval](./docs/rules/no-eval.md)           | CWE-95 | A03:2021 | Prevent code injection via `eval()`, `new Function()` | 💼  |     | 💡  |
| [no-innerhtml](./docs/rules/no-innerhtml.md) | CWE-79 | A03:2021 | Prevent XSS via `innerHTML`, `outerHTML`              | 💼  |     | 💡  |

### postMessage Security

| Rule                                                                                 | CWE     | OWASP    | Description                                       | 💼  | 🔧  | 💡  |
| ------------------------------------------------------------------------------------ | ------- | -------- | ------------------------------------------------- | --- | --- | --- |
| [require-postmessage-origin-check](./docs/rules/require-postmessage-origin-check.md) | CWE-346 | A01:2021 | Require origin validation in postMessage handlers | 💼  |     | 💡  |
| [no-postmessage-wildcard-origin](./docs/rules/no-postmessage-wildcard-origin.md)     | CWE-346 | A01:2021 | Prevent wildcard targetOrigin in postMessage      | 💼  |     | 💡  |
| [no-postmessage-innerhtml](./docs/rules/no-postmessage-innerhtml.md)                 | CWE-79  | A03:2021 | Prevent XSS via innerHTML in postMessage handlers | 💼  |     | 💡  |

### Storage Security

| Rule                                                                       | CWE     | OWASP    | Description                              | 💼  | 🔧  | 💡  |
| -------------------------------------------------------------------------- | ------- | -------- | ---------------------------------------- | --- | --- | --- |
| [no-sensitive-localstorage](./docs/rules/no-sensitive-localstorage.md)     | CWE-922 | A02:2021 | Prevent sensitive data in localStorage   | 💼  |     | 💡  |
| [no-sensitive-sessionstorage](./docs/rules/no-sensitive-sessionstorage.md) | CWE-922 | A02:2021 | Prevent sensitive data in sessionStorage | 💼  |     | 💡  |
| [no-sensitive-indexeddb](./docs/rules/no-sensitive-indexeddb.md)           | CWE-922 | A02:2021 | Prevent sensitive data in IndexedDB      | 💼  |     | 💡  |
| [no-jwt-in-storage](./docs/rules/no-jwt-in-storage.md)                     | CWE-922 | A02:2021 | Prevent JWT tokens in browser storage    | 💼  |     | 💡  |

### Cookie Security

| Rule                                                                       | CWE      | OWASP    | Description                                  | 💼  | 🔧  | 💡  |
| -------------------------------------------------------------------------- | -------- | -------- | -------------------------------------------- | --- | --- | --- |
| [no-sensitive-cookie-js](./docs/rules/no-sensitive-cookie-js.md)           | CWE-1004 | A02:2021 | Prevent sensitive data in cookies via JS     | 💼  |     | 💡  |
| [no-cookie-auth-tokens](./docs/rules/no-cookie-auth-tokens.md)             | CWE-1004 | A02:2021 | Prevent auth tokens in JS-accessible cookies | 💼  |     | 💡  |
| [require-cookie-secure-attrs](./docs/rules/require-cookie-secure-attrs.md) | CWE-614  | A05:2021 | Require Secure and SameSite attributes       | 💼  |     | 💡  |

### WebSocket Security

| Rule                                                             | CWE     | OWASP    | Description                       | 💼  | 🔧  | 💡  |
| ---------------------------------------------------------------- | ------- | -------- | --------------------------------- | --- | --- | --- |
| [require-websocket-wss](./docs/rules/require-websocket-wss.md)   | CWE-319 | A02:2021 | Require secure WebSocket (wss://) | 💼  |     | 💡  |
| [no-websocket-innerhtml](./docs/rules/no-websocket-innerhtml.md) | CWE-79  | A03:2021 | Prevent XSS in WebSocket handlers | 💼  |     | 💡  |
| [no-websocket-eval](./docs/rules/no-websocket-eval.md)           | CWE-95  | A03:2021 | Prevent RCE in WebSocket handlers | 💼  |     | 💡  |

### File API & Workers Security

| Rule                                                                           | CWE     | OWASP    | Description                         | 💼  | 🔧  | 💡  |
| ------------------------------------------------------------------------------ | ------- | -------- | ----------------------------------- | --- | --- | --- |
| [no-filereader-innerhtml](./docs/rules/no-filereader-innerhtml.md)             | CWE-79  | A03:2021 | Prevent XSS with FileReader data    | 💼  |     | 💡  |
| [require-blob-url-revocation](./docs/rules/require-blob-url-revocation.md)     | CWE-401 | A04:2021 | Require revoking Blob URLs          | 💼  |     | 💡  |
| [no-dynamic-service-worker-url](./docs/rules/no-dynamic-service-worker-url.md) | CWE-829 | A08:2021 | Prevent dynamic service worker URLs | 💼  |     | 💡  |
| [no-worker-message-innerhtml](./docs/rules/no-worker-message-innerhtml.md)     | CWE-79  | A03:2021 | Prevent XSS in Worker handlers      | 💼  |     | 💡  |

### CSP Security

| Rule                                                         | CWE    | OWASP    | Description                     | 💼  | 🔧  | 💡  |
| ------------------------------------------------------------ | ------ | -------- | ------------------------------- | --- | --- | --- |
| [no-unsafe-inline-csp](./docs/rules/no-unsafe-inline-csp.md) | CWE-79 | A03:2021 | Disallow 'unsafe-inline' in CSP | 💼  |     | 💡  |
| [no-unsafe-eval-csp](./docs/rules/no-unsafe-eval-csp.md)     | CWE-95 | A03:2021 | Disallow 'unsafe-eval' in CSP   | 💼  |     | 💡  |

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

| Rule                               | OWASP Top 10 2021           | Category                |
| ---------------------------------- | --------------------------- | ----------------------- |
| `no-eval`                          | A03: Injection              | Code Injection          |
| `no-innerhtml`                     | A03: Injection              | DOM XSS                 |
| `no-sensitive-localstorage`        | A02: Cryptographic Failures | Sensitive Data Exposure |
| `require-postmessage-origin-check` | A01: Broken Access Control  | Origin Validation       |

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

| Plugin                                                                                           |                                                              Downloads                                                               | Description                 | Rules |
| ------------------------------------------------------------------------------------------------ | :----------------------------------------------------------------------------------------------------------------------------------: | --------------------------- | :---: |
| [`eslint-plugin-secure-coding`](https://www.npmjs.com/package/eslint-plugin-secure-coding)       |    [![npm](https://img.shields.io/npm/dm/eslint-plugin-secure-coding.svg)](https://npmjs.com/package/eslint-plugin-secure-coding)    | Universal security patterns |  89   |
| [`eslint-plugin-crypto`](https://www.npmjs.com/package/eslint-plugin-crypto)                     |           [![npm](https://img.shields.io/npm/dm/eslint-plugin-crypto.svg)](https://npmjs.com/package/eslint-plugin-crypto)           | Cryptographic security      |  24   |
| [`eslint-plugin-jwt`](https://www.npmjs.com/package/eslint-plugin-jwt)                           |              [![npm](https://img.shields.io/npm/dm/eslint-plugin-jwt.svg)](https://npmjs.com/package/eslint-plugin-jwt)              | JWT handling security       |  13   |
| [`eslint-plugin-express-security`](https://www.npmjs.com/package/eslint-plugin-express-security) | [![npm](https://img.shields.io/npm/dm/eslint-plugin-express-security.svg)](https://npmjs.com/package/eslint-plugin-express-security) | Express.js security         |   8   |
| [`eslint-plugin-nestjs-security`](https://www.npmjs.com/package/eslint-plugin-nestjs-security)   |  [![npm](https://img.shields.io/npm/dm/eslint-plugin-nestjs-security.svg)](https://npmjs.com/package/eslint-plugin-nestjs-security)  | NestJS security             |   5   |
| [`eslint-plugin-lambda-security`](https://www.npmjs.com/package/eslint-plugin-lambda-security)   |  [![npm](https://img.shields.io/npm/dm/eslint-plugin-lambda-security.svg)](https://npmjs.com/package/eslint-plugin-lambda-security)  | AWS Lambda security         |   5   |

## 📄 License

MIT © [Ofri Peretz](https://github.com/ofri-peretz)
