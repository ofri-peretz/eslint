---
title: no-postmessage-innerhtml
description: "The rule provides LLM-optimized error messages (Compact 2-line format) with actionable security guidance:"
tags: ['security', 'browser']
category: security
severity: medium
cwe: CWE-693
owasp: "A03:2021"
autofix: false
---

> 🔒 Disallow using innerHTML with postMessage data

<!-- @rule-summary -->
The rule provides LLM-optimized error messages (Compact 2-line format) with actionable security guidance:
<!-- @/rule-summary -->

**CWE:** [CWE-693](https://cwe.mitre.org/data/definitions/693.html)  
**OWASP Mobile:** [OWASP Mobile Top 10](https://owasp.org/www-project-mobile-top-10/)

## Error Message Format

The rule provides **LLM-optimized error messages** (Compact 2-line format) with actionable security guidance:

```text
⚠️ CWE-79 OWASP:A05 CVSS:6.1 | Cross-site Scripting (XSS) detected | MEDIUM [SOC2,PCI-DSS,GDPR,ISO27001]
   Fix: Review and apply the recommended fix | https://owasp.org/Top10/A05_2021/
```

### Message Components

| Component | Purpose | Example |
| :--- | :--- | :--- |
| **Risk Standards** | Security benchmarks | [CWE-79](https://cwe.mitre.org/data/definitions/79.html) [OWASP:A05](https://owasp.org/Top10/A05_2021-Injection/) CVSS Score |
| **Issue Description** | Specific vulnerability | `Cross-site Scripting (XSS) detected` |
| **Severity & Compliance** | Impact assessment | `MEDIUM [SOC2,PCI-DSS,GDPR,ISO27001]` |
| **Fix Instruction** | Actionable remediation | `Follow the remediation steps below` |
| **Technical Truth** | Official reference | [OWASP Top 10](https://owasp.org/Top10/A05_2021-Injection/) |

## Rule Details

This rule prevents using `innerHTML`, `outerHTML`, `insertAdjacentHTML()`, or `document.write()` with data received from postMessage events. This pattern enables XSS attacks through malicious messages.

### Why is this dangerous?

```mermaid
sequenceDiagram
    participant A as Attacker Page
    participant V as Vulnerable Page
    participant U as User Browser

    A->>V: postMessage({html: "<script>steal()</script>"})
    V->>V: element.innerHTML = event.data.html
    Note over V: XSS Executed!
    V->>A: Stolen cookies/data
```

When you use innerHTML with postMessage data:

1. **Any window can send messages** to your page
2. **Malicious HTML/scripts are executed** when assigned to innerHTML
3. **Attackers can steal data, session tokens**, and perform actions as the user

## Examples

### ❌ Incorrect

```javascript
// Direct innerHTML with event.data
window.addEventListener('message', (event) => {
  element.innerHTML = event.data;
});

// Nested property access
window.addEventListener('message', (event) => {
  container.innerHTML = event.data.content;
});

// outerHTML is equally dangerous
window.addEventListener('message', (event) => {
  widget.outerHTML = event.data.html;
});

// insertAdjacentHTML
window.addEventListener('message', (event) => {
  list.insertAdjacentHTML('beforeend', event.data);
});

// document.write (rare but dangerous)
window.addEventListener('message', (event) => {
  document.write(event.data);
});
```

### ✅ Correct

```javascript
// Use textContent for plain text
window.addEventListener('message', (event) => {
  if (event.origin !== 'https://trusted.com') return;
  element.textContent = event.data;
});

// Sanitize before using innerHTML
window.addEventListener('message', (event) => {
  if (event.origin !== 'https://trusted.com') return;
  const sanitized = DOMPurify.sanitize(event.data);
  element.innerHTML = sanitized;
});

// Use intermediate variable (sanitized)
window.addEventListener('message', (event) => {
  if (event.origin !== 'https://trusted.com') return;
  const safeHtml = DOMPurify.sanitize(event.data.content);
  container.innerHTML = safeHtml;
});

// Use DOM APIs instead
window.addEventListener('message', (event) => {
  if (event.origin !== 'https://trusted.com') return;
  const text = document.createTextNode(event.data);
  element.appendChild(text);
});
```

## Options

```json
{
  "browser-security/no-postmessage-innerhtml": [
    "error",
    {
      "allowInTests": true
    }
  ]
}
```

| Option         | Type      | Default | Description                                        |
| -------------- | --------- | ------- | -------------------------------------------------- |
| `allowInTests` | `boolean` | `true`  | Skip checking in test files (_.test.ts, _.spec.ts) |

## When Not To Use It

You may disable this rule if:

- You're handling postMessage in a sandbox/isolated context
- You have thorough sanitization that the rule can't detect

However, **always sanitize postMessage data** before rendering as HTML.

## Related Rules

- [`browser-security/require-postmessage-origin-check`](./require-postmessage-origin-check.md) - Require origin validation
- [`browser-security/no-postmessage-wildcard-origin`](./no-postmessage-wildcard-origin.md) - Prevent wildcard targetOrigin
- [`browser-security/no-innerhtml`](./no-innerhtml.md) - General innerHTML prevention

## Known False Negatives

The following patterns are **not detected** due to static analysis limitations:

### Event Data Stored in Variable

**Why**: Data stored in variables not traced.

```typescript
// ❌ NOT DETECTED - Data stored first
window.addEventListener('message', (event) => {
  const html = event.data;
  element.innerHTML = html;
});
```

**Mitigation**: Sanitize before any variable assignment.

### Separate Handler Function

**Why**: Handler internals not analyzed.

```typescript
// ❌ NOT DETECTED - External handler
window.addEventListener('message', handlePostMessage);
```

**Mitigation**: Apply rule to handler implementations.

### Custom Sanitizer

**Why**: Non-standard sanitizers may not be recognized.

```typescript
// ❌ NOT DETECTED - Custom sanitizer
element.innerHTML = mySanitizeFunc(event.data);
```

**Mitigation**: Configure trusted sanitizer names.

## OWASP Mapping

| Category          | ID                   |
| ----------------- | -------------------- |
| OWASP Top 10 2021 | A03:2021 - Injection |
| CWE               | CWE-79               |
| CVSS              | 8.8 (High)           |