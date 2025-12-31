---
title: 'Getting Started with eslint-plugin-browser-security'
published: false
description: 'Browser security in 60 seconds. 21 rules for XSS, storage, postMessage, and CSP.'
tags: javascript, security, browser, tutorial
cover_image:
series: Getting Started
---

# Getting Started with eslint-plugin-browser-security

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

## Quick Reference

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

[GitHub](https://github.com/ofri-peretz) | [LinkedIn](https://linkedin.com/in/ofri-peretz)
