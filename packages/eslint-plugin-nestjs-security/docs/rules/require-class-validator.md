# require-class-validator

> Require class-validator decorators on DTO properties

## Rule Details

This rule detects DTO classes with properties that lack class-validator decorators, which can lead to invalid or malicious data being accepted.

## OWASP Mapping

- **OWASP Top 10 2021**: A03:2021 - Injection
- **CWE**: CWE-20 - Improper Input Validation
- **CVSS**: 7.5 (High)

## ❌ Incorrect

```typescript
class CreateUserDto {
  name: string; // No validation
  email: string; // No validation
}
```

## ✅ Correct

```typescript
import { IsString, IsEmail, IsNotEmpty, MinLength } from 'class-validator';

class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  name: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;
}
```

## Options

```typescript
{
  // Skip rule in test files (default: true)
  allowInTests?: boolean;
}
```

## Common Validators

| Decorator       | Purpose               |
| --------------- | --------------------- |
| `@IsString()`   | Must be a string      |
| `@IsNumber()`   | Must be a number      |
| `@IsEmail()`    | Must be valid email   |
| `@IsNotEmpty()` | Cannot be empty       |
| `@MinLength(n)` | Minimum string length |
| `@MaxLength(n)` | Maximum string length |
| `@IsOptional()` | Field is optional     |
| `@IsUUID()`     | Must be valid UUID    |
| `@IsEnum(enum)` | Must be enum value    |

## When Not To Use It

- For internal DTOs that don't accept external input
- For DTOs used only in tests
