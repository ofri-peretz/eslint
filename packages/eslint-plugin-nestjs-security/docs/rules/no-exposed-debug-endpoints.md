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

This rule inspects **route paths only**: the path argument of `@Controller(...)`
(string or `{ path: '...' }` object form) and of the HTTP-method decorators. It
reports a debug route that is not protected by a guard.

Earlier versions matched every string literal in the file, which flagged enum
members (`EnumLoggerLevel.debug`), seed data and config values — 24 findings
across two NestJS boilerplates, none of them an endpoint.

`admin`, `test` and `health` were removed from the default path list: they are
ordinary route names in every NestJS application. Add them back through the
`endpoints` option if your project treats them as internal.

A route is considered protected when the handler or its controller carries
`@UseGuards`, carries a decorator the plugin cannot resolve (a guard composite
such as `@AuthJwtAccessProtected()`), or the project registers a global
`APP_GUARD`. `@Public()` does **not** protect a debug route — that is the whole
finding.

## ❌ Incorrect

```typescript
// ❌ Debug path on the route handler
@Controller('utils')
export class UtilsController {
  @Get('debug')
  getDebugInfo() {
    return process.memoryUsage();
  }
}

// ❌ Debug base path on the controller — every route under it is a debug route,
//    including ones whose own path says nothing about debugging
@Controller({ version: '1', path: '/__debug__' })
export class DebugController {
  @Get('state')
  state() {
    return this.debugService.dump();
  }
}
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

  // ✅ Debug endpoint behind a guard
  @UseGuards(AdminGuard)
  @Get('debug')
  getStatus() {
    return { status: 'OK' };
  }
}

// ✅ Not a route — plain strings and enum members are never inspected
export enum EnumLoggerLevel {
  debug = 'debug',
}
```

## ⚙️ Configuration

| Option        | Type       | Default          | Description                                  |
| :------------ | :--------- | :--------------- | :------------------------------------------- |
| `endpoints`   | `string[]` | `['debug', ...]` | Custom list of debug/admin endpoints to flag |
| `ignoreFiles` | `string[]` | `[]`             | List of files or patterns to ignore          |
| `detectGlobalGuards` | `boolean` | `true` | Suppress findings when `APP_GUARD` is registered |

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

- Values stored in variables/constants used in decorators (`@Get(DEBUG_PATH)`).
- Dynamic path generation using template literals.
- Debug routes on a controller that carries any decorator the plugin cannot
  resolve — it is assumed to be a guard composite.
- Any debug route in a project that registers a global `APP_GUARD`
  (`detectGlobalGuards: false` restores the check).

## References

- [CWE-489](https://cwe.mitre.org/data/definitions/489.html)
- [NestJS Guards Documentation](https://docs.nestjs.com/guards)