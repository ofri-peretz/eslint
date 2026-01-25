---
title: require-guards
description: 'require-guards'
category: security
tags: ['security', 'nestjs']
---


> Require @UseGuards decorator on controllers or route handlers

## Error Message Format

The rule provides **LLM-optimized error messages** (Compact 2-line format) with actionable security guidance:

```text
🔒 CWE-284 OWASP:A01 CVSS:7.5 | Improper Access Control detected | HIGH
   Fix: Review and apply the recommended fix | https://owasp.org/Top10/A01_2021/
```

### Message Components

| Component | Purpose | Example |
| :--- | :--- | :--- |
| **Risk Standards** | Security benchmarks | [CWE-284](https://cwe.mitre.org/data/definitions/284.html) [OWASP:A01](https://owasp.org/Top10/A01_2021-Injection/) [CVSS:7.5](https://nvd.nist.gov/vuln-metrics/cvss/v3-calculator?vector=AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H) |
| **Issue Description** | Specific vulnerability | `Improper Access Control detected` |
| **Severity & Compliance** | Impact assessment | `HIGH` |
| **Fix Instruction** | Actionable remediation | `Follow the remediation steps below` |
| **Technical Truth** | Official reference | [OWASP Top 10](https://owasp.org/Top10/A01_2021-Injection/) |

## Rule Details

This rule detects NestJS controllers and route handlers that lack authorization guards, which can lead to unauthorized access to protected resources.

## OWASP Mapping

- **OWASP Top 10 2021**: A01:2021 - Broken Access Control
- **CWE**: CWE-284 - Improper Access Control
- **CVSS**: 9.8 (Critical)

## ❌ Incorrect

```typescript
@Controller('users')
class UsersController {
  @Get()
  findAll() {
    // No authentication - anyone can access!
  }
}
```

## ✅ Correct

```typescript
import { UseGuards } from '@nestjs/common';
import { AuthGuard } from './auth.guard';

// Class-level protection
@Controller('users')
@UseGuards(AuthGuard)
class UsersController {
  @Get()
  findAll() {}
}

// Or method-level protection
@Controller('users')
class UsersController {
  @Get()
  @UseGuards(AuthGuard)
  findAll() {}
}
```

## Options

```typescript
{
  // Skip rule in test files (default: true)
  allowInTests?: boolean;

  // Specific guards to require (default: any guard)
  requiredGuards?: string[];

  // Allow @Public decorator to bypass (default: true)
  allowPublicDecorator?: boolean;

  // Skip if global guards configured in main.ts (default: false)
  assumeGlobalGuards?: boolean;
}
```

## Recognized Skip Decorators

- `@Public()`
- `@SkipAuth()`
- `@AllowAnonymous()`
- `@NoAuth()`

## When Not To Use It

- If you have `app.useGlobalGuards()` in `main.ts`, set `assumeGlobalGuards: true`
- For intentionally public endpoints, use `@Public()` decorator

## Known False Negatives

The following patterns are **not detected** due to static analysis limitations:

### Global Guards in Separate Module

**Why**: Global guards in main.ts or module providers are not linked.

```typescript
// ❌ NOT DETECTED - Global guard exists elsewhere
// main.ts: app.useGlobalGuards(new AuthGuard())
// controller.ts: No @UseGuards needed, but flagged
```

**Mitigation**: Set `assumeGlobalGuards: true` in rule options.

### Custom Authorization Decorators

**Why**: Custom decorators wrapping guards are not recognized.

```typescript
// ❌ NOT DETECTED - Custom auth decorator
@CustomAuth('admin') // Internally applies AuthGuard
class AdminController {}
```

**Mitigation**: Add custom decorator to recognized skip decorators list.

### Guard Applied via Inheritance

**Why**: Guards on parent controller are not visible.

```typescript
// ❌ NOT DETECTED - Guard on parent
@UseGuards(AuthGuard)
class BaseController {}

class UsersController extends BaseController {
  @Get()
  findAll() {} // Protected by inheritance, but not detected
}
```

**Mitigation**: Apply guards explicitly on each controller.

### Module-Level Guard Providers

**Why**: Guards registered as APP_GUARD providers are not detected.

```typescript
// ❌ NOT DETECTED - APP_GUARD provider
@Module({
  providers: [{ provide: APP_GUARD, useClass: AuthGuard }]
})
```

**Mitigation**: Set assumeGlobalGuards for modules with APP_GUARD.
