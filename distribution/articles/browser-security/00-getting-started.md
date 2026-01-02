---
title: 'Getting Started with eslint-plugin-browser-security'
published: true
description: 'Browser security in 60 seconds. 21 rules for XSS, storage, postMessage, and CSP.'
tags: javascript, security, browser, tutorial
cover_image:
series: Getting Started
---

**21 browser security rules. XSS prevention. Storage safety. postMessage.**

## Quick Install

```bash
npm install --save-dev eslint-plugin-browser-security
```

## Flat Config

```javascript
// eslint.config.js
import browserSecurity from 'eslint-plugin-browser-security';

export default [browserSecurity.configs.recommended];
```

## Rule Overview

| Category         | Rules | Examples                                             |
| ---------------- | ----- | ---------------------------------------------------- |
| XSS Prevention   | 7     | no-innerhtml, no-eval, no-websocket-innerhtml        |
| Storage Security | 4     | no-sensitive-localstorage, no-jwt-in-storage         |
| postMessage      | 3     | no-postmessage-wildcard-origin, require-origin-check |
| Cookie Security  | 2     | require-cookie-secure-attrs, no-sensitive-cookie-js  |
| CSP              | 2     | no-unsafe-inline-csp, no-unsafe-eval-csp             |
| Other            | 3     | require-websocket-wss, require-blob-url-revocation   |

## Run ESLint

```bash
npx eslint .
```

You'll see output like:

```bash
src/components/preview.tsx
  42:5  error  🔒 CWE-79 CVSS:6.1 | innerHTML is XSS vulnerable
               Fix: Use textContent or sanitize with DOMPurify

src/utils/storage.ts
  18:3  error  🔒 CWE-922 | Storing JWT in localStorage is insecure
               Fix: Use httpOnly cookies or sessionStorage with expiry

src/messaging/iframe.ts
  31:1  error  🔒 CWE-345 | postMessage with '*' origin is dangerous
               Fix: Specify exact origin: postMessage(data, 'https://trusted.com')
```

## Quick Wins

### XSS Prevention

```javascript
// ❌ Dangerous: XSS vulnerability
element.innerHTML = userInput;

// ✅ Safe: Use textContent
element.textContent = userInput;

// ✅ Safe: Sanitize HTML
import DOMPurify from 'dompurify';
element.innerHTML = DOMPurify.sanitize(userInput);
```

### Storage Security

```javascript
// ❌ Dangerous: JWT in localStorage
localStorage.setItem('token', jwt);

// ✅ Better: Use httpOnly cookies (server-side)
// Or if you must use storage:
sessionStorage.setItem('token', jwt); // Clears on tab close
```

### postMessage Security

```javascript
// ❌ Dangerous: Wildcard origin
window.parent.postMessage(data, '*');

// ✅ Safe: Explicit origin
window.parent.postMessage(data, 'https://trusted-parent.com');

// ✅ Safe: Origin validation in listener
window.addEventListener('message', (event) => {
  if (event.origin !== 'https://trusted-sender.com') return;
  // Handle message
});
```

```bash
# Install
npm install --save-dev eslint-plugin-browser-security

# Config (eslint.config.js)
import browserSecurity from 'eslint-plugin-browser-security';
export default [browserSecurity.configs.recommended];

# Run
npx eslint .
```

---

📦 [npm: eslint-plugin-browser-security](https://www.npmjs.com/package/eslint-plugin-browser-security)
📖 [Full Rule List](https://github.com/ofri-peretz/eslint/tree/main/packages/eslint-plugin-browser-security/docs/rules)

{% cta https://github.com/ofri-peretz/eslint %}
⭐ Star on GitHub
{% endcta %}

---

🚀 **Building for browsers? Run the linter!**

[GitHub](https://github.com/interlace-collie) | [X](https://x.com/ofriperetzdev) | [LinkedIn](https://linkedin.com/in/ofri-peretz) | [Dev.to](https://dev.to/ofriperetz)
