---
title: require-guards
description: "The rule provides LLM-optimized error messages (Compact 2-line format) with actionable security guidance:"
tags: ['security', 'nestjs']
category: security
severity: medium
cwe: CWE-284
owasp: "A01:2021"
autofix: false
---

> Require @UseGuards decorator on controllers or route handlers


<!-- @rule-summary -->
The rule provides LLM-optimized error messages (Compact 2-line format) with actionable security guidance:
<!-- @/rule-summary -->

## Error Message Format

The rule provides **LLM-optimized error messages** (Compact 2-line format) with actionable security guidance:

```text
🔒 CWE-284 OWASP:A01 CVSS:7.5 | Improper Access Control detected | HIGH
   Fix: Review and apply the recommended fix | https://owasp.org/Top10/A01_2021/
```

### Message Components

| Component | Purpose | Example |
| :--- | :--- | :--- |
| **Risk Standards** | Security benchmarks | [CWE-284](https://cwe.mitre.org/data/definitions/284.html) [OWASP:A01](https://owasp.org/Top10/A01_2021-Injection/) [CVSS:7.5](https://nvd.nist.gov/vuln-metrics/cvss/v3-calculator?vector=AV%3AN%2FAC%3AL%2FPR%3AN%2FUI%3AN%2FS%3AU%2FC%3AH%2FI%3AH%2FA%3AH) |
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

  // Specific guard classes that satisfy the rule (default: [] — any guard)
  requiredGuards?: string[];

  // Allow @Public decorator to bypass (default: true)
  allowPublicDecorator?: boolean;

  // Skip the rule entirely, without scanning the project (default: false)
  assumeGlobalGuards?: boolean;

  // Treat an unresolvable decorator as a possible guard composite (default: true)
  allowCustomDecorators?: boolean;

  // Suppress findings when APP_GUARD / useGlobalGuards is registered (default: true)
  detectGlobalGuards?: boolean;

  // Handler names / route segments that are unauthenticated by design
  publicRoutePatterns?: string[];
}
```

### `requiredGuards` — demand a *specific* guard

By default any `@UseGuards(...)` satisfies the rule. `requiredGuards` narrows
that to a named set: the guard argument must be one of them.

```jsonc
{ "requiredGuards": ["JwtAuthGuard"] }
```

```typescript
@Controller('users')
class UsersController {
  @UseGuards(JwtAuthGuard) // ✅ the required guard
  @Get('me')
  me() {}

  @UseGuards(RolesGuard) // ❌ guarded, but not by JwtAuthGuard
  @Get()
  findAll() {}
}
```

Guard arguments are read syntactically, so `@UseGuards(AuthGuard('jwt'))` and
`@UseGuards(guards.JwtAuthGuard)` both resolve to `AuthGuard` / `JwtAuthGuard`.

**The option is deliberately conservative — it can only add findings where the
guard is visible.** Three cases still suppress the report, because none of them
can be *proven* not to apply the required guard:

- a `@UseGuards` whose arguments have no static name (`@UseGuards(...guards)`,
  `@UseGuards()`, a bare `@UseGuards`),
- an unresolved composite decorator such as `@AuthJwtAccessProtected()` — the
  `allowCustomDecorators` exemption; set it to `false` to close this hole,
- a global `APP_GUARD` / `app.useGlobalGuards()` registration — the
  `detectGlobalGuards` exemption; set it to `false` to close this one.

## Recognized Skip Decorators

- `@Public()`
- `@SkipAuth()`
- `@AllowAnonymous()`
- `@NoAuth()`
- `@IsPublic()`, `@Anonymous()`

## What the rule deliberately does not report

Three exemptions exist because they were pure noise on real NestJS codebases:

1. **Composite decorators.** A route carrying any decorator the plugin cannot
   resolve — `@AuthJwtAccessProtected()`, `@ApiKeyProtected()`, `@RoleProtected()` —
   is assumed to be protected. These are `applyDecorators(UseGuards(...))`
   wrappers that a syntax-only linter cannot follow. Disable with
   `allowCustomDecorators: false`.
2. **Global guards.** `{ provide: APP_GUARD, useClass: AuthGuard }` in any module,
   or `app.useGlobalGuards()` in the bootstrap file, protects every route in the
   project. A `ThrottlerGuard` registered as `APP_GUARD` does **not** count —
   throttling is not authentication. Disable with `detectGlobalGuards: false`.
3. **Credential-issuing routes.** `login`, `register`, `forgotPassword`,
   `resetPassword`, `confirmEmail`, `refresh`, `health`, `webhook`, … cannot
   require the credential they hand out. Matched against the handler name and
   each route-path segment; override with `publicRoutePatterns`.

## When Not To Use It

- If you have `app.useGlobalGuards()` in `main.ts`, set `assumeGlobalGuards: true`
- For intentionally public endpoints, use `@Public()` decorator

## Known False Negatives

The following patterns are **not detected** due to static analysis limitations:

### Routes behind an unresolvable decorator

**Why**: Any decorator the plugin cannot resolve is assumed to guard the route,
so a genuinely unprotected route that happens to carry an unrelated custom
decorator is not reported. This is the deliberate trade that removed 93 false
positives from a single boilerplate.

```typescript
// ❌ NOT DETECTED - @Audited() is not a guard, but we cannot know that
@Controller('users')
class UsersController {
  @Audited()
  @Get()
  findAll() {}
}
```

**Mitigation**: Set `allowCustomDecorators: false` to report these again.

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

**Detected since v1.3.0.** `{ provide: APP_GUARD, useClass: AuthGuard }` in any
`*.module.ts` under the project root now suppresses the per-controller check.
The consequence is the inverse false negative: a project with a global guard
gets no `require-guards` findings at all, even on a controller the guard's own
logic lets through.

```typescript
// Suppresses require-guards project-wide
@Module({
  providers: [{ provide: APP_GUARD, useClass: AuthGuard }]
})
```

**Mitigation**: Set `detectGlobalGuards: false` to keep per-controller checking.