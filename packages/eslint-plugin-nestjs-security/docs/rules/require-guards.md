---
title: require-guards
description: 'The rule provides LLM-optimized error messages (Compact 2-line format) with actionable security guidance:'
tags: ['security', 'nestjs']
category: security
severity: medium
cwe: CWE-284
owasp: 'A01:2021'
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

| Component                 | Purpose                | Example                                                                                                                                                                                                                                                       |
| :------------------------ | :--------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Risk Standards**        | Security benchmarks    | [CWE-284](https://cwe.mitre.org/data/definitions/284.html) [OWASP:A01](https://owasp.org/Top10/A01_2021-Injection/) [CVSS:7.5](https://nvd.nist.gov/vuln-metrics/cvss/v3-calculator?vector=AV%3AN%2FAC%3AL%2FPR%3AN%2FUI%3AN%2FS%3AU%2FC%3AH%2FI%3AH%2FA%3AH) |
| **Issue Description**     | Specific vulnerability | `Improper Access Control detected`                                                                                                                                                                                                                            |
| **Severity & Compliance** | Impact assessment      | `HIGH`                                                                                                                                                                                                                                                        |
| **Fix Instruction**       | Actionable remediation | `Follow the remediation steps below`                                                                                                                                                                                                                          |
| **Technical Truth**       | Official reference     | [OWASP Top 10](https://owasp.org/Top10/A01_2021-Injection/)                                                                                                                                                                                                   |

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

  // Require these specific guards by name, not merely *a* guard (default: any)
  requiredGuards?: string[];

  // Let @Public/@IsPublic/@SkipAuth/@AllowAnonymous/@Anonymous/@NoAuth and
  // @HealthCheck mark a route as intentionally open (default: true)
  allowPublicDecorator?: boolean;

  // Scan the project's module and bootstrap files for an app-wide guard
  // (APP_GUARD / app.useGlobalGuards) and stay silent when one exists
  // (default: true)
  detectGlobalGuards?: boolean;

  // Assume a global guard without scanning, for registrations the scan cannot
  // resolve — built at runtime, or supplied by a library (default: false)
  assumeGlobalGuards?: boolean;

  // Extra decorator names that count as access control. Rarely needed: a
  // decorator imported from a module whose path mentions auth/guard/policy is
  // recognised automatically (default: [])
  authDecorators?: string[];

  // Route path segments that cannot require authentication, because they are
  // how a caller obtains it. Matched per segment, so /admin/login-attempts is
  // still private. Omit the key to keep the built-in list; pass [] to require
  // a guard on every route (default: login, signin, register, refresh,
  // callback, webhook, health, …)
  publicRoutes?: string[];
}
```

## Recognized Skip Decorators

- `@Public()`, `@IsPublic()`
- `@SkipAuth()`, `@NoAuth()`
- `@AllowAnonymous()`, `@Anonymous()`
- `@HealthCheck()` — `@nestjs/terminus` marks a probe, which is public by design

## When It Abstains

Each of these was measured. Together they took the rule from **94 findings on
corpus1, of which ~9 were real, to 14** — without losing a single true positive.

### The project has no authentication system

A rule that says "this route has no guard" only means something where guards
are the mechanism. The scan looks for an auth dependency in `package.json` and
for a guard, strategy or `JwtModule` named in any module file; when it finds
neither, it stays silent for the whole project.

**38 of the original 94 findings were NestJS's own `sample/*` tutorial apps**,
only one of which (`19-auth-jwt`) authenticates anything.

Conservative on purpose: an unreadable or absent manifest counts as _yes_, so
the rule keeps reporting. A hand-rolled `CanActivate` with no dependency to
declare is picked up by the module scan.

### Authentication is applied as middleware

```typescript
// realworld/src/article/article.module.ts — no @UseGuards anywhere in the app
export class ArticleModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(AuthMiddleware)
      .forRoutes(
        { path: 'articles/feed', method: RequestMethod.GET },
        { path: 'articles/:slug', method: RequestMethod.DELETE },
      );
  }
}
```

Middleware is a first-class NestJS auth mechanism, and a guard-only rule
reports the entire application: **20 findings, one repository**. The rule
abstains for any controller whose prefix — or whose own route path, or whose
class name — appears in a `forRoutes` list attached to an auth middleware.

Deliberately coarse. Lining a `forRoutes` pattern up with a controller prefix
plus a handler path is not something a static match gets right, so it abstains
per controller rather than clearing routes it cannot actually clear.

### The handler verifies a credential header

```typescript
// amplication/.../subscription.controller.ts:20
@Post('updateStatus')
async updateStatus(@Headers('stigg-webhooks-secret') secret, @Body() dto) {
  if (secret !== this.stiggWebhooksSecret) throw new Error('Invalid secret');
}
```

A webhook receiver authenticates by comparing a shared secret or an HMAC
signature — what Stripe, GitHub and Stigg all document. There is no NestJS-side
identity to establish, so there is no guard to demand.

### The route is `GET /` with nothing to identify

```typescript
@Controller()
class AppController {
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}
```

The controller `nest new` writes. No path on either decorator, no parameter,
GET — it names no resource and accepts no input. **15 of the 32 findings that
survived the first two abstentions were this exact shape**, nine of them the
same generated file across one monorepo's services.

Every clause is load-bearing: a path, a parameter, or any other method puts the
route back in scope. And the test is _no argument_, not _no readable path_ —
`@Controller(ADMIN_PREFIX)` is still reported.

### The route is an authentication entry point

`login`, `callback`, `register`, `refresh`, `reset-password`, `webhook`,
`oauth` and the rest of `publicRoutes`, matched against the controller prefix,
the route path (including adjacent segments joined, so `@Post('reset/password')`
meets `reset-password`) and the trailing token of the handler name.

The trailing token is what makes `auth0Login`, `githubCallback` and
`auth0CallbackPost` work — an entry point is nearly always qualified by its
provider or transport. Only the tail counts, so `getLoginHistory` reads as a
resource listing and stays in scope.

## When Not To Use It

- If `app.useGlobalGuards()` runs in `main.ts` and the project scan cannot see
  it, set `assumeGlobalGuards: true`.
- For an intentionally public endpoint the list does not cover, use `@Public()`
  or add the segment to `publicRoutes`.

## Known False Negatives

### A guard on a parent controller in another file

```typescript
// base.controller.ts
@UseGuards(AuthGuard)
export class BaseController {}

// users.controller.ts — the extends chain is followed within one file only
class UsersController extends BaseController {
  @Get('all')
  findAll() {} // protected, and correctly not reported
}
```

**Why**: the rule follows `extends` inside the file it is linting, so a base
class declared elsewhere is invisible. It abstains rather than accuse.

### Every route in a middleware-covered controller

Abstaining per controller means a genuinely unguarded route in a controller
whose siblings are middleware-protected is not reported.

**Mitigation**: `forRoutes` lists are short and live in the module file — read
them alongside the controller.

### A collection read mounted at the application root

The `GET /` exemption above clears a zero-parameter root GET. A handler that
returns a full collection from `GET /` is not reported.

**Mitigation**: none needed in practice — across 32,251 corpus files, every
instance of this shape was the `nest new` scaffold.
