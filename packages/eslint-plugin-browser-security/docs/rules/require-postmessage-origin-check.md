---
title: require-postmessage-origin-check
description: Detects postMessage event handlers without origin validation
tags: ['security', 'browser']
category: security
severity: medium
cwe: CWE-346
autofix: false
---

> **Keywords:** postMessage, cross-origin, CWE-346, security, iframe, message validation

<!-- @rule-summary -->

Detects postMessage event handlers without origin validation
<!-- @/rule-summary -->

**CWE:** [CWE-346](https://cwe.mitre.org/data/definitions/346.html)  
**OWASP Mobile:** [OWASP Mobile Top 10](https://owasp.org/www-project-mobile-top-10/)

Detects postMessage event handlers without origin validation. This rule is part of [`eslint-plugin-browser-security`](https://www.npmjs.com/package/eslint-plugin-browser-security).

⚠️ This rule **_errors_** by default in the `recommended` config.

## Quick Summary

| Aspect            | Details                                        |
| ----------------- | ---------------------------------------------- |
| **CWE Reference** | CWE-346 (Origin Validation Error)              |
| **Severity**      | 🔴 High                                        |
| **Auto-Fix**      | ✅ Yes (suggests origin check)                 |
| **Category**      | Security                                       |
| **Best For**      | Apps using iframes, cross-window communication |

## Vulnerability and Risk

**Vulnerability:** Accepting postMessage events without validating the origin allows any website to send messages to your application.

**Risk:** Attackers can:

- Inject malicious data/commands
- Trigger unauthorized actions
- Bypass authentication

## PostMessage Attack Flow

```mermaid
%%{init: {
  'theme': 'base',
  'themeVariables': {
    'primaryColor': '#f8fafc',
    'primaryTextColor': '#1e293b',
    'primaryBorderColor': '#334155',
    'lineColor': '#475569'
  }
}}%%
sequenceDiagram
    participant Attacker Site
    participant Victim's Browser
    participant Target App (iframe)

    Attacker Site->>Victim's Browser: Embed target app in iframe
    Attacker Site->>Target App (iframe): postMessage({action: 'transfer', amount: 10000})
    Target App (iframe)->>Target App (iframe): No origin check!
    Target App (iframe)->>Target App (iframe): Executes malicious action

    Note over Attacker Site,Target App (iframe): Attack succeeds because origin wasn't validated
```

## Examples

### ❌ Incorrect

```javascript
// No origin check - VULNERABLE
window.addEventListener('message', (event) => {
  const { action, data } = event.data;
  processAction(action, data); // Anyone can trigger this!
});

// Empty origin check - VULNERABLE
window.addEventListener('message', (event) => {
  if (event.origin) {
    // This is always truthy!
    processAction(event.data);
  }
});

// The onmessage property registers the same cross-window listener
window.onmessage = (event) => {
  processAction(event.data);
};

// includes() on a STRING is a substring test: 'https://trusted.co' passes
window.addEventListener('message', (event) => {
  if (!'https://trusted.com'.includes(event.origin)) return;
  processAction(event.data);
});
```

### ✅ Correct

```javascript
// Exact comparison
window.addEventListener('message', (event) => {
  if (event.origin !== 'https://trusted.com') return;
  processAction(event.data);
});

// Exact-match allowlist: Array includes() / Set has() compare whole strings
const ALLOWED = ['https://trusted.com', 'https://app.trusted.com'];
window.onmessage = (event) => {
  if (!ALLOWED.includes(event.origin)) return;
  processAction(event.data);
};

// A fully anchored, dot-escaped origin pattern
window.addEventListener('message', (event) => {
  if (!/^https:\/\/trusted\.com$/.test(event.origin)) return;
  processAction(event.data);
});

// A WebSocket / Worker / BroadcastChannel message has no origin to check
const ws = new WebSocket('wss://api.example.com');
ws.onmessage = (event) => render(event.data);
```

Message listeners are recognised as `addEventListener('message', fn)` on any
receiver not proven to be a WebSocket, EventSource, Worker, SharedWorker,
BroadcastChannel or MessagePort, and as `window.onmessage` / `self.onmessage` /
`globalThis.onmessage` / a bare global `onmessage = fn`. A handler passed by
reference is not analysed.

## Options

| Option         | Type      | Default | Description                                     |
| -------------- | --------- | ------- | ----------------------------------------------- |
| `allowInTests` | `boolean` | `false` | Skip this rule in `*.test.*` / `*.spec.*` files |

```json
{
  "rules": {
    "browser-security/require-postmessage-origin-check": "error"
  }
}
```

## Best Practices

### 1. Use Allowlist Pattern

```javascript
const ALLOWED_ORIGINS = new Set([
  'https://parent.example.com',
  'https://embed.example.com',
]);

function handleMessage(event) {
  if (!ALLOWED_ORIGINS.has(event.origin)) {
    return;
  }
  // Process message
}
```

### 2. Validate Message Structure

```javascript
window.addEventListener('message', (event) => {
  // 1. Check origin
  if (event.origin !== 'https://trusted.com') return;

  // 2. Validate message structure
  if (!event.data || typeof event.data.action !== 'string') {
    console.error('Invalid message structure');
    return;
  }

  // 3. Whitelist allowed actions
  const ALLOWED_ACTIONS = ['resize', 'navigate', 'close'];
  if (!ALLOWED_ACTIONS.includes(event.data.action)) {
    console.error('Unknown action:', event.data.action);
    return;
  }

  processAction(event.data);
});
```

## Related Rules

- [`no-innerhtml`](./no-innerhtml.md) - XSS prevention
- [`no-sensitive-localstorage`](./no-sensitive-localstorage.md) - Storage security

## Known False Negatives

The following patterns are **not detected** due to static analysis limitations:

### Handler in Separate Function

**Why**: Origin check in called function not visible.

```typescript
// ❌ NOT DETECTED - Check in handler
window.addEventListener('message', handleMessage); // validates internally
```

**Mitigation**: Apply rule to handler implementations.

### Dynamic Event Registration

**Why**: Events registered dynamically may not be detected.

```typescript
// ❌ NOT DETECTED - Dynamic registration
const eventType = 'message';
window.addEventListener(eventType, handler);
```

**Mitigation**: Use static event registration.

### Weak Origin Checks

**Why**: Check quality is assessed only for `includes()` on a string literal (a substring test) and for regexp anchoring. A substring test ON the origin string is still read as a check.

```typescript
// ❌ NOT DETECTED - Weak check
if (event.origin.includes('trusted')) {
  // Insecure!
  processAction(event.data);
}
```

**Mitigation**: Use exact origin comparison.

### Library Abstractions

**Why**: Third-party message handlers not analyzed.

```typescript
// ❌ NOT DETECTED - Library abstraction
messageLib.onMessage((data) => process(data)); // No origin check visible
```

**Mitigation**: Review library security. Configure message handlers.

## Resources

- [CWE-346: Origin Validation Error](https://cwe.mitre.org/data/definitions/346.html)
- [MDN: Window.postMessage()](https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage#security_concerns)
- [OWASP HTML5 Security](https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html#postmessage)
