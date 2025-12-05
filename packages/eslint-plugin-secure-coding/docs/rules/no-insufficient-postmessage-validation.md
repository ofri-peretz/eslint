# no-insufficient-postmessage-validation

> **Keywords:** postMessage, CWE-346, origin validation, cross-origin, iframe, security

Detects insufficient postMessage origin validation. This rule is part of [`eslint-plugin-secure-coding`](https://www.npmjs.com/package/eslint-plugin-secure-coding).

💼 This rule is set to **error** in the `recommended` config.

## Quick Summary

| Aspect | Details |
|--------|---------|
| **CWE Reference** | CWE-346 (Origin Validation Error) |
| **Severity** | High (CVSS 8.8) |
| **Auto-Fix** | 💡 Suggestions available |
| **Category** | Platform-Specific |

## Rule Details

postMessage is a browser API for cross-origin communication that can be exploited if messages are accepted from untrusted origins. Attackers can:
- Send malicious messages from hostile iframes
- Perform cross-site scripting attacks
- Steal sensitive data from embedded content
- Bypass security controls

### Why This Matters

| Issue | Impact | Solution |
|-------|--------|----------|
| 🎭 **XSS** | Code execution | Validate event.origin |
| 📤 **Data Theft** | Information disclosure | Whitelist trusted origins |
| 🔓 **Bypass** | Security control evasion | Validate message content |

## Examples

### ❌ Incorrect

```typescript
// No origin validation
window.addEventListener('message', (event) => {
  eval(event.data); // Extremely dangerous!
});

// Wildcard origin in postMessage
iframe.contentWindow.postMessage(data, '*'); // Any origin!

// Incomplete origin validation
window.addEventListener('message', (event) => {
  if (event.origin.includes('trusted.com')) {
    // Bypassable with: evil-trusted.com
    processMessage(event.data);
  }
});

// Missing validation entirely
window.onmessage = function(e) {
  document.getElementById('output').innerHTML = e.data;
};
```

### ✅ Correct

```typescript
// Strict origin validation
const TRUSTED_ORIGINS = [
  'https://trusted.com',
  'https://app.trusted.com'
];

window.addEventListener('message', (event) => {
  if (!TRUSTED_ORIGINS.includes(event.origin)) {
    console.warn('Rejected message from:', event.origin);
    return;
  }
  
  // Validate message structure
  if (typeof event.data !== 'object' || !event.data.type) {
    return;
  }
  
  // Process validated message
  processMessage(event.data);
});

// Specific origin in postMessage
iframe.contentWindow.postMessage(data, 'https://trusted.com');

// Type-safe message handling
interface Message {
  type: 'action';
  payload: string;
}

window.addEventListener('message', (event) => {
  if (event.origin !== 'https://trusted.com') return;
  
  const message = event.data as Message;
  if (message.type === 'action') {
    safeAction(message.payload);
  }
});
```

## Configuration

```javascript
{
  rules: {
    'secure-coding/no-insufficient-postmessage-validation': ['error', {
      allowedOrigins: ['https://trusted.com'],
      allowWildcardInDev: false,
      messageHandlerPatterns: ['onmessage', 'message'],
      safeOrigins: ['localhost', '127.0.0.1']
    }]
  }
}
```

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `allowedOrigins` | `string[]` | `[]` | Allowed postMessage origins |
| `allowWildcardInDev` | `boolean` | `false` | Allow `*` in development |
| `messageHandlerPatterns` | `string[]` | `['message', 'onmessage']` | Message handler patterns |
| `safeOrigins` | `string[]` | `['localhost']` | Origins considered safe |

## Error Message Format

```
🔒 CWE-346 OWASP:A07-Auth CVSS:8.8 | Insufficient postMessage Validation | HIGH [SOC2,PCI-DSS]
   Fix: Validate event.origin against whitelist before processing | https://developer.mozilla.org/...
```

## Further Reading

- **[MDN postMessage](https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage)** - API documentation
- **[CWE-346](https://cwe.mitre.org/data/definitions/346.html)** - Origin validation error
- **[OWASP postMessage](https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html#postmessage)** - Security cheat sheet

## Related Rules

- [`no-electron-security-issues`](./no-electron-security-issues.md) - Electron security
- [`no-missing-cors-check`](./no-missing-cors-check.md) - CORS validation

