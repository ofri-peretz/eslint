---
title: no-client-side-auth-logic
description: Prevent client-side authentication logic that can be bypassed. This rule is part of eslint-plugin-browser-security and provides LLM-optimized error messages.
tags: ['security', 'browser', 'client-side', 'authentication']
category: security
severity: high
autofix: false
---

> **Keywords:** browser, security, authentication, client-side, ESLint rule, LLM-optimized


<!-- @rule-summary -->
Prevent client-side authentication logic that can be bypassed. This rule is part of eslint-plugin-browser-security and provides LLM-optimized error messages.
<!-- @/rule-summary -->

Prevent client-side authentication logic that can be bypassed. This rule is part of [`eslint-plugin-browser-security`](https://www.npmjs.com/package/eslint-plugin-browser-security).

## Quick Summary

| Aspect         | Details                                 |
| -------------- | --------------------------------------- |
| **Severity**   | Error (security)                        |
| **Auto-Fix**   | ❌ No auto-fix                          |
| **Category**   | Browser Security                        |
| **ESLint MCP** | ✅ Optimized for ESLint MCP integration |

## Rule Details

Client-side authentication checks can be easily bypassed. Always validate authentication on the server.

## Examples

### ❌ Incorrect

```javascript
if (localStorage.getItem('authenticated')) { proceed() }
```

### ✅ Correct

```javascript
// Server validates and returns appropriate response
const response = await fetch('/api/admin/panel', {
  headers: { Authorization: `Bearer ${token}` },
});

if (response.ok) {
  showAdminPanel();
}
```

## Configuration

```javascript
{
  rules: {
    'browser-security/no-client-side-auth-logic': 'error'
  }
}
```

## ⚙️ Options

| Option | Type | Default | Description |
| ------ | ---- | ------- | ----------- |
| `authKeywords` | `string[]` | `["admin","authenticated","authorized","isAdmin","isAuthenticated","role"]` | Storage keys indicating a client-side authorization decision, matched whole-word against the key segments. |
| `credentialProperties` | `string[]` | `["password","secret","token"]` | Property names treated as credentials in an equality comparison. |
