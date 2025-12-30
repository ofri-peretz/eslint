# require-throttler

> Require ThrottlerGuard or @Throttle decorator for rate limiting

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
