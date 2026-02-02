---
title: require-throttler
description: This rule detects NestJS controllers and route handlers that lack rate limiting, which can make the application vulne...
tags: ['security', 'nestjs']
category: security
severity: medium
cwe: CWE-770
owasp: "A05:2021"
autofix: false
---

> Require ThrottlerGuard or @Throttle decorator for rate limiting


<!-- @rule-summary -->
This rule detects NestJS controllers and route handlers that lack rate limiting, which can make the application vulne...
<!-- @/rule-summary -->

## Rule Details

This rule detects NestJS controllers and route handlers that lack rate limiting, which can make the application vulnerable to brute-force and denial-of-service attacks.

## OWASP Mapping

- **OWASP Top 10 2021**: A05:2021 - Security Misconfiguration
- **CWE**: CWE-770 - Allocation of Resources Without Limits or Throttling
- **CVSS**: 7.5 (High)

## ❌ Incorrect

```typescript
@Controller('auth')
class AuthController {
  @Post('login')
  login() {
    // No rate limiting - vulnerable to brute force!
  }
}
```

## ✅ Correct

```typescript
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';

@Controller('auth')
@UseGuards(ThrottlerGuard)
class AuthController {
  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 attempts per minute
  login() {}
}

// Or in app.module.ts (global)
@Module({
  imports: [ThrottlerModule.forRoot([{ ttl: 60000, limit: 10 }])],
})
export class AppModule {}
```

## Options

```typescript
{
  // Skip rule in test files (default: true)
  allowInTests?: boolean;

  // Skip if global throttler configured in app.module (default: false)
  assumeGlobalThrottler?: boolean;
}
```

## Recognized Skip Decorators

- `@SkipThrottle()` - Built-in decorator from @nestjs/throttler

## When Not To Use It

- If you have `ThrottlerModule.forRoot()` in `app.module.ts`, set `assumeGlobalThrottler: true`
- For endpoints that intentionally skip throttling, use `@SkipThrottle()` decorator

## Known False Negatives

The following patterns are **not detected** due to static analysis limitations:

### Global Throttler Module

**Why**: ThrottlerModule.forRoot in app.module is not linked to controllers.

```typescript
// ❌ NOT DETECTED - Global throttler exists
// app.module.ts: imports: [ThrottlerModule.forRoot(...)]
// controller.ts: Already throttled globally, but flagged
```

**Mitigation**: Set `assumeGlobalThrottler: true` in rule options.

### Custom Rate Limiting

**Why**: Custom rate limiting implementations are not recognized.

```typescript
// ❌ NOT DETECTED - Custom rate limiter
@UseInterceptors(CustomRateLimiter)
class AuthController {}
```

**Mitigation**: Configure rule to recognize custom rate limiting decorators.

### Infrastructure Rate Limiting

**Why**: Reverse proxy or API gateway limits are not visible.

```typescript
// ❌ NOT DETECTED (correctly) - Kong/Nginx handles limits
@Controller('auth')
class AuthController {}
```

**Mitigation**: Document infrastructure rate limits. Add inline comment.

### Dynamic Throttle Configuration

**Why**: Throttle options from variables are not analyzed.

```typescript
// ❌ NOT DETECTED - Dynamic throttle config
const throttleConfig = getThrottleConfig();
@Throttle(throttleConfig) // May be undefined
class Controller {}
```

**Mitigation**: Use inline throttle configuration.