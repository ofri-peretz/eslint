---
title: require-network-timeout
description: Require timeout configuration for network requests. This rule is part of eslint-plugin-reliability and provides LLM-optimized error messages.
tags: ['quality', 'reliability']
category: quality
autofix: suggestions
---

> **Keywords:** network, timeout, fetch, http, ESLint rule, reliability, performance, LLM-optimized


<!-- @rule-summary -->
Require timeout configuration for network requests. This rule is part of eslint-plugin-reliability and provides LLM-optimized error messages.
<!-- @/rule-summary -->

Require timeout configuration for network requests. This rule is part of [`eslint-plugin-reliability`](https://www.npmjs.com/package/eslint-plugin-reliability) and provides LLM-optimized error messages with suggestions.

## Quick Summary

| Aspect         | Details                                 |
| -------------- | --------------------------------------- |
| **Severity**   | Warning (reliability)                   |
| **Auto-Fix**   | 💡 Suggests fixes                       |
| **Category**   | Reliability                             |
| **ESLint MCP** | ✅ Optimized for ESLint MCP integration |
| **Best For**   | Applications making HTTP requests       |

## Rule Details

This rule ensures that all network requests include timeout configuration to prevent hanging connections and improve application reliability.

### Why This Matters

| Issue                   | Impact                        | Solution               |
| ----------------------- | ----------------------------- | ---------------------- |
| ⏱️ **Hanging Requests** | App freezes waiting forever   | Set explicit timeouts  |
| 🔄 **Resource Leaks**   | Connections never released    | Abort after timeout    |
| 👤 **User Experience**  | Users wait indefinitely       | Fail fast with timeout |
| 📊 **Monitoring**       | Hard to detect slow endpoints | Timeout helps identify |

## Examples

### ❌ Incorrect

```typescript
// fetch without timeout
const response = await fetch('/api/data');

// axios without timeout
const result = await axios.get('/api/users');

// HTTP client without timeout config
const data = await httpClient.request({ url: '/api' });
```

### ✅ Correct

```typescript
// fetch with AbortController timeout
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 5000);

try {
  const response = await fetch('/api/data', {
    signal: controller.signal,
  });
} finally {
  clearTimeout(timeoutId);
}

// axios with timeout
const result = await axios.get('/api/users', {
  timeout: 5000,
});

// Using a timeout utility
async function fetchWithTimeout(url: string, timeout = 5000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, { signal: controller.signal });
    return response;
  } finally {
    clearTimeout(id);
  }
}

// Global axios configuration
const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
});
```

## Configuration Examples

### Basic Usage

```javascript
{
  rules: {
    'reliability/require-network-timeout': 'warn'
  }
}
```

### Custom Timeout Threshold

```javascript
{
  rules: {
    'reliability/require-network-timeout': ['warn', {
      minTimeout: 3000,
      maxTimeout: 30000
    }]
  }
}
```

## Related Rules

- [`no-await-in-loop`](./no-await-in-loop.mdx) - Optimize async loops
- [`no-unhandled-promise`](../maintainability/rules/no-unhandled-promise.mdx) - Handle async errors

## Further Reading

- **[AbortController](https://developer.mozilla.org/en-US/docs/Web/API/AbortController)** - MDN documentation
- **[Axios Timeout](https://axios-http.com/docs/req_config)** - Axios configuration
- **[ESLint MCP Setup](https://eslint.org/docs/latest/use/mcp)** - Enable AI assistant integration