# require-class-validator

> Require class-validator decorators on DTO properties

## Error Message Format

The rule provides **LLM-optimized error messages** (Compact 2-line format) with actionable security guidance:

```text
🔒 CWE-20 OWASP:A06 CVSS:7.5 | Improper Input Validation detected | HIGH [SOC2,PCI-DSS,HIPAA,GDPR,ISO27001]
   Fix: Review and apply the recommended fix | https://owasp.org/Top10/A06_2021/
```

### Message Components

| Component | Purpose | Example |
| :--- | :--- | :--- |
| **Risk Standards** | Security benchmarks | [CWE-20](https://cwe.mitre.org/data/definitions/20.html) [OWASP:A06](https://owasp.org/Top10/A06_2021-Injection/) [CVSS:7.5](https://nvd.nist.gov/vuln-metrics/cvss/v3-calculator?vector=AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H) |
| **Issue Description** | Specific vulnerability | `Improper Input Validation detected` |
| **Severity & Compliance** | Impact assessment | `HIGH [SOC2,PCI-DSS,HIPAA,GDPR,ISO27001]` |
| **Fix Instruction** | Actionable remediation | `Follow the remediation steps below` |
| **Technical Truth** | Official reference | [OWASP Top 10](https://owasp.org/Top10/A06_2021-Injection/) |

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

## Known False Negatives

The following patterns are **not detected** due to static analysis limitations:

### Inherited Properties

**Why**: Validators on parent class properties are not visible.

```typescript
// ❌ NOT DETECTED - Validation on parent
class BaseDto {
  @IsString()
  name: string;
}
class CreateUserDto extends BaseDto {
  email: string; // Only this is checked
}
```

**Mitigation**: Add validators on subclass or use composition.

### Index Signatures

**Why**: Dynamic properties are not validated.

```typescript
// ❌ NOT DETECTED - Index signature
class ConfigDto {
  @IsString()
  name: string;

  [key: string]: any; // Arbitrary properties accepted!
}
```

**Mitigation**: Avoid index signatures in DTOs. Use strict typing.

### Nested Objects Without @ValidateNested

**Why**: Nested validation requires explicit decorator.

```typescript
// ❌ NOT DETECTED - Nested object not validated
class OrderDto {
  @IsString()
  orderId: string;

  items: OrderItemDto[]; // Items not validated!
}
```

**Mitigation**: Use @ValidateNested() and @Type() for nested objects.

### Optional Fields Without @IsOptional

**Why**: Optional TypeScript properties may still require validation.

```typescript
// ❌ NOT DETECTED - Optional but no IsOptional
class UpdateUserDto {
  name?: string; // TypeScript optional, but validation unclear
}
```

**Mitigation**: Explicitly add @IsOptional() on optional fields.
