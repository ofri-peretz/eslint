---
title: no-overly-permissive-iam-policy
description: Security rule for lambda-security. This rule is part of eslint-plugin-lambda-security and provides LLM-optimized error messages.
tags: ['security', 'aws', 'serverless']
category: security
severity: medium
autofix: false
---

> **Keywords:** lambda-security, security, ESLint rule, LLM-optimized


<!-- @rule-summary -->
Security rule for lambda-security. This rule is part of eslint-plugin-lambda-security and provides LLM-optimized error messages.
<!-- @/rule-summary -->

This rule is part of [`eslint-plugin-lambda-security`](https://www.npmjs.com/package/eslint-plugin-lambda-security).

## Quick Summary

| Aspect         | Details                                 |
| -------------- | --------------------------------------- |
| **Severity**   | Warning (security)                      |
| **Auto-Fix**   | ❌ No auto-fix                          |
| **Category**   | Security                                |
| **ESLint MCP** | ✅ Optimized for ESLint MCP integration |

## Rule Details

This rule helps enforce secure coding practices for lambda-security applications.

## Configuration

```javascript
{
  rules: {
    'lambda-security/no-overly-permissive-iam-policy': 'warn'
  }
}
```