# require-guards

> Require @UseGuards decorator on controllers or route handlers

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
