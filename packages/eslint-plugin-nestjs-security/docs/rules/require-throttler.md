---
title: require-throttler
description: Reports once, on the root module, when the application configures no rate limiter (ThrottlerModule + Throttler...
tags: ['security', 'nestjs']
category: security
severity: medium
cwe: CWE-770
owasp: "A05:2021"
autofix: false
---

> Requires an application-wide ThrottlerModule for rate limiting


<!-- @rule-summary -->
Reports once, on the root module, when the application configures no rate limiter (ThrottlerModule + ThrottlerGuard).
<!-- @/rule-summary -->

## Rule Details

This rule reports **once per project**, on the root module, when the application
configures no rate limiter. Rate limiting in NestJS is adopted with a single
`ThrottlerModule.forRoot()` registration plus a global `ThrottlerGuard`, so
flagging every route handler turned a one-line fix into dozens of errors (24 on
one boilerplate, 93 on another). Nothing is reported on controllers.

The root module is a `@Module`-decorated class named `AppModule`, or any
`@Module` class in a file named `app.module.ts`. Both are configurable.

Rate limiting is considered configured when any of the following appears in the
file being linted or in any `*.module.ts` / `main.ts` under the project root:

- `ThrottlerModule.forRoot(...)` or `ThrottlerModule.forRootAsync(...)`
- `{ provide: APP_GUARD, useClass: ThrottlerGuard }`
- any reference to `ThrottlerGuard` / `ThrottlerStorage`

## OWASP Mapping

- **OWASP Top 10 2021**: A05:2021 - Security Misconfiguration
- **CWE**: CWE-770 - Allocation of Resources Without Limits or Throttling
- **CVSS**: 7.5 (High)

## ❌ Incorrect

```typescript
// app.module.ts — nothing throttles login, register or password reset
@Module({
  imports: [AuthModule, UsersModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
```

## ✅ Correct

```typescript
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

@Module({
  imports: [ThrottlerModule.forRoot([{ ttl: 60000, limit: 10 }])],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
```

Per-route tuning still works as usual, and is no longer required to silence the
rule:

```typescript
@Post('login')
@Throttle({ default: { limit: 5, ttl: 60000 } })
login() {}
```

## Options

```typescript
{
  // Skip rule in test files (default: true)
  allowInTests?: boolean;

  // Skip the rule entirely, without scanning the project (default: false)
  assumeGlobalThrottler?: boolean;

  // Class names treated as the root module (default: ['AppModule'])
  rootModuleNames?: string[];

  // File names treated as the root module (default: ['app.module.ts'])
  rootModuleFiles?: string[];

  // Deprecated, no longer used — the rule never reports per route
  skipRoutes?: string[];
}
```

## When Not To Use It

- If rate limiting is handled by infrastructure (Kong, Nginx, an API gateway),
  set `assumeGlobalThrottler: true`.
- If your project has no root module (a library, or a Nest microservice built
  from several entry points), the rule has nothing to report.

## Known False Negatives

The following patterns are **not detected** due to static analysis limitations:

### Root Module Outside the Lint Scope

**Why**: The finding is attached to the root module. If `app.module.ts` is not
linted, nothing is reported even when the project has no rate limiting.

**Mitigation**: Include module files in your lint glob.

### Custom Rate Limiting

**Why**: Custom rate limiting implementations are not recognized.

```typescript
// ❌ NOT DETECTED - Custom rate limiter
@UseInterceptors(CustomRateLimiter)
class AuthController {}
```

**Mitigation**: Set `assumeGlobalThrottler: true`, or reference `ThrottlerGuard`
where your limiter is registered.

### Per-Route Gaps Under a Global Throttler

**Why**: Once `ThrottlerModule` is configured, the rule is silent. It cannot tell
whether a specific route's limit is appropriate for a brute-forceable endpoint.

**Mitigation**: Review `@Throttle()` limits on authentication routes by hand.
