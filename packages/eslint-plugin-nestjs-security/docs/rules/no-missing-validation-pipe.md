# no-missing-validation-pipe

> Require ValidationPipe for DTO input parameters

## Rule Details

This rule detects NestJS route handlers that accept DTO parameters without ValidationPipe, which can lead to injection attacks through unvalidated input.

## OWASP Mapping

- **OWASP Top 10 2021**: A03:2021 - Injection
- **CWE**: CWE-20 - Improper Input Validation
- **CVSS**: 8.6 (High)

## ❌ Incorrect

```typescript
@Controller('users')
class UsersController {
  @Post()
  create(@Body() dto: CreateUserDto) {
    // No validation - malicious input can pass through!
  }
}
```

## ✅ Correct

```typescript
import { UsePipes, ValidationPipe } from '@nestjs/common';

// Class-level validation
@Controller('users')
@UsePipes(new ValidationPipe())
class UsersController {
  @Post()
  create(@Body() dto: CreateUserDto) {}
}

// Or in main.ts (global)
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
);
```

## Options

```typescript
{
  // Skip rule in test files (default: true)
  allowInTests?: boolean;

  // Skip if global pipes configured in main.ts (default: false)
  assumeGlobalPipes?: boolean;
}
```

## Recommended ValidationPipe Options

```typescript
new ValidationPipe({
  whitelist: true, // Strip non-decorated properties
  forbidNonWhitelisted: true, // Throw on extra properties
  transform: true, // Auto-transform to DTO types
});
```

## When Not To Use It

- If you have `app.useGlobalPipes(new ValidationPipe())` in `main.ts`, set `assumeGlobalPipes: true`
