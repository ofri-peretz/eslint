---
title: no-exposed-debug-endpoints
description: Identifies potential debug, administration, or testing endpoints that are often left exposed in production environmen...
tags: ['security', 'nestjs']
category: security
severity: medium
cwe: CWE-489
autofix: false
---

> **Keywords:** NestJS, debug endpoint, admin path, exposed routes, @Get, @Post, decoractor security, CWE-489, OWASP M8, test endpoints, information disclosure, unauthorized access


<!-- @rule-summary -->
Identifies potential debug, administration, or testing endpoints that are often left exposed in production environmen...
<!-- @/rule-summary -->

**CWE:** [CWE-489](https://cwe.mitre.org/data/definitions/489.html)  
**OWASP Mobile:** [OWASP Mobile Top 10 M8](https://owasp.org/www-project-mobile-top-10/)

Identifies potential debug, administration, or testing endpoints that are often left exposed in production environments without proper authentication. This rule is part of [`eslint-plugin-nestjs-security`](https://www.npmjs.com/package/eslint-plugin-nestjs-security) and provides LLM-optimized error messages.

**🚨 Security rule** | **💡 Provides LLM-optimized guidance** | **⚠️ Set to error in `recommended`**

## Quick Summary

| Aspect            | Details                                                                   |
| :---------------- | :------------------------------------------------------------------------ |
| **CWE Reference** | [CWE-489](https://cwe.mitre.org/data/definitions/489.html) (Active Debug) |
| **Severity**      | 🟠 HIGH (security misconfiguration)                                       |
| **Auto-Fix**      | ❌ Not available                                                          |
| **Category**   | Security |
| **ESLint MCP**    | ✅ Optimized                                                              |
| **Best For**      | NestJS Controllers                                                        |

## Rule Details

This rule scans for NestJS HTTP decorators (`@Get`, `@Post`, etc.) and literal string constants that match known sensitive paths.

## ❌ Incorrect

```typescript
@Controller('utils')
export class UtilsController {
  // ❌ NestJS Get decorator using a debug path
  @Get('debug')
  getDebugInfo() {
    return process.memoryUsage();
  }

  // ❌ Admin path exposed
  @Post('/admin/reset')
  resetSystem() {
    // ...
  }
}

// ❌ Literal string matching a forbidden path
const myPath = 'test-endpoint';
```

## ✅ Correct

```typescript
@Controller('profile')
export class ProfileController {
  // ✅ Standard production endpoint
  @Get('me')
  getProfile() {
    return { name: 'User' };
  }

  // ✅ Debug endpoint protected by a Guard (Rule still flags path, but this is the goal)
  @UseGuards(AdminGuard)
  @Get('internal-status')
  getStatus() {
    return { status: 'OK' };
  }
}
```

## ⚙️ Configuration

| Option        | Type       | Default          | Description                                  |
| :------------ | :--------- | :--------------- | :------------------------------------------- |
| `endpoints`   | `string[]` | `['debug', ...]` | Custom list of debug/admin endpoints to flag |
| `ignoreFiles` | `string[]` | `[]`             | List of files or patterns to ignore          |

### Example Configuration

```json
{
  "rules": {
    "nestjs-security/no-exposed-debug-endpoints": [
      "error",
      {
        "endpoints": ["internal-tools", "dev-only"],
        "ignoreFiles": ["**/*.spec.ts"]
      }
    ]
  }
}
```

## Known False Negatives

- Values stored in variables/constants used in decorators.
- Dynamic path generation using template literals if not easily resolvable.

## References

- [CWE-489](https://cwe.mitre.org/data/definitions/489.html)
- [NestJS Guards Documentation](https://docs.nestjs.com/guards)