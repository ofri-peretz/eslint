---
title: 'WebSocket Security: From wss:// to Origin Validation'
published: false
description: 'WebSocket connections bypass same-origin policy. Here are the security concerns and how ESLint catches them.'
tags: websocket, security, javascript, eslint
cover_image:
series: Browser Security
---

```javascript
const ws = new WebSocket('ws://api.example.com');
```

Two problems: unencrypted and no origin validation.

## Problem #1: Unencrypted WebSocket

```javascript
// ❌ Unencrypted - traffic visible
const ws = new WebSocket('ws://api.example.com');

// ✅ Encrypted - TLS protected
const ws = new WebSocket('wss://api.example.com');
```

## Problem #2: No Origin Validation

WebSocket doesn't enforce same-origin policy. Any site can connect.

```javascript
// Server must validate origin
wss.on('connection', (ws, req) => {
  const origin = req.headers.origin;

  if (!allowedOrigins.includes(origin)) {
    ws.close(1008, 'Invalid origin');
    return;
  }

  // Handle connection
});
```

## Problem #3: Data Injection

```javascript
// ❌ XSS via WebSocket
ws.onmessage = (event) => {
  document.body.innerHTML += event.data;
};

// ✅ Safe handling
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  const element = document.createElement('div');
  element.textContent = data.message;
  document.body.appendChild(element);
};
```

## ESLint Rules

```javascript
import browserSecurity from 'eslint-plugin-browser-security';

export default [
  {
    rules: {
      'browser-security/require-websocket-wss': 'error',
      'browser-security/no-websocket-innerhtml': 'error',
      'browser-security/no-websocket-eval': 'error',
    },
  },
];
```

## Quick Install


---

📦 [npm: eslint-plugin-browser-security](https://www.npmjs.com/package/eslint-plugin-browser-security)

---

🚀 **Using WebSockets? Check your ws:// vs wss://!**


{% cta https://github.com/ofri-peretz/eslint %}
⭐ Star on GitHub
{% endcta %}
[GitHub](https://github.com/interlace-collie) | [X](https://x.com/ofriperetzdev) | [LinkedIn](https://linkedin.com/in/ofri-peretz) | [Dev.to](https://dev.to/ofriperetz)
