# eslint-plugin-browser-security

> 🔐 Security-focused ESLint plugin for browser applications. Detects XSS vulnerabilities, postMessage abuse, storage API token exposure, cookie security issues, WebSocket vulnerabilities, and more.

[![npm version](https://img.shields.io/npm/v/eslint-plugin-browser-security.svg)](https://www.npmjs.com/package/eslint-plugin-browser-security)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![codecov](https://codecov.io/gh/ofri-peretz/eslint/graph/badge.svg?flag=eslint-plugin-browser-security)](https://codecov.io/gh/ofri-peretz/eslint)

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

## 📋 Rules

| Rule                                                                                   | Description                                                                       | CVSS | CWE      |
| -------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | ---- | -------- |
| [`no-eval`](./docs/rules/no-eval.md)                                                   | Prevent code injection via `eval()`, `new Function()`, and string-based callbacks | 9.3  | CWE-95   |
| [`no-innerhtml`](./docs/rules/no-innerhtml.md)                                         | Prevent XSS via `innerHTML`, `outerHTML`, and `insertAdjacentHTML()`              | 8.1  | CWE-79   |
| [`no-sensitive-localstorage`](./docs/rules/no-sensitive-localstorage.md)               | Prevent storing sensitive data in localStorage                                    | 7.5  | CWE-922  |
| [`require-postmessage-origin-check`](./docs/rules/require-postmessage-origin-check.md) | Require origin validation in postMessage handlers                                 | 9.3  | CWE-346  |
| [`no-postmessage-wildcard-origin`](./docs/rules/no-postmessage-wildcard-origin.md)     | Prevent wildcard targetOrigin in postMessage calls                                | 7.5  | CWE-346  |
| [`no-sensitive-cookie-js`](./docs/rules/no-sensitive-cookie-js.md)                     | Prevent storing sensitive data in cookies via JavaScript                          | 8.1  | CWE-1004 |
| [`require-websocket-wss`](./docs/rules/require-websocket-wss.md)                       | Require secure WebSocket connections (wss://)                                     | 7.5  | CWE-319  |

### 🗺️ Roadmap: Coming Soon

The following rules are planned based on [browser security research](./docs/BROWSER-SECURITY-RESEARCH.md):

| Category         | Rules                                                                              | Priority |
| ---------------- | ---------------------------------------------------------------------------------- | -------- |
| **Storage APIs** | `no-sensitive-sessionstorage`, `no-jwt-in-storage`, `no-sensitive-indexeddb`       | P0       |
| **postMessage**  | `no-postmessage-innerhtml`                                                         | P0       |
| **Cookies**      | `no-cookie-auth-tokens`, `require-cookie-secure-attrs`                             | P0-P1    |
| **File API**     | `no-filereader-innerhtml`, `require-blob-url-revocation`, `no-blob-html-execution` | P0-P1    |
| **WebSocket**    | `no-websocket-innerhtml`, `no-websocket-eval`                                      | P0-P1    |
| **Workers**      | `no-dynamic-service-worker-url`, `no-worker-message-innerhtml`                     | P1       |
| **CSP**          | `no-unsafe-inline-csp`, `no-unsafe-eval-csp`                                       | P1       |

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

Part of the [Forge-JS ESLint Security Ecosystem](https://github.com/ofri-peretz/eslint):

| Package                                                               | Focus                       |
| --------------------------------------------------------------------- | --------------------------- |
| [`eslint-plugin-secure-coding`](../eslint-plugin-secure-coding)       | Universal security patterns |
| [`eslint-plugin-crypto`](../eslint-plugin-crypto)                     | Cryptographic security      |
| [`eslint-plugin-jwt`](../eslint-plugin-jwt)                           | JWT handling security       |
| [`eslint-plugin-express-security`](../eslint-plugin-express-security) | Express.js security         |
| [`eslint-plugin-nestjs-security`](../eslint-plugin-nestjs-security)   | NestJS security             |
| [`eslint-plugin-lambda-security`](../eslint-plugin-lambda-security)   | AWS Lambda security         |

## 📄 License

MIT © [Ofri Peretz](https://github.com/ofri-peretz)
