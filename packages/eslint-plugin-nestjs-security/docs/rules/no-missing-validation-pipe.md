---
title: no-missing-validation-pipe
description: 'The rule provides LLM-optimized error messages (Compact 2-line format) with actionable security guidance:'
tags: ['security', 'nestjs']
category: security
severity: medium
cwe: CWE-20
owasp: 'A03:2021'
autofix: false
---

> Require ValidationPipe for DTO input parameters

<!-- @rule-summary -->

The rule provides LLM-optimized error messages (Compact 2-line format) with actionable security guidance:
<!-- @/rule-summary -->

## Error Message Format

The rule provides **LLM-optimized error messages** (Compact 2-line format) with actionable security guidance:

```text
🔒 CWE-20 OWASP:A06 CVSS:7.5 | Improper Input Validation detected | HIGH [SOC2,PCI-DSS,HIPAA,GDPR,ISO27001]
   Fix: Review and apply the recommended fix | https://owasp.org/Top10/A06_2021/
```

### Message Components

| Component                 | Purpose                | Example                                                                                                                                                                                                                                                     |
| :------------------------ | :--------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Risk Standards**        | Security benchmarks    | [CWE-20](https://cwe.mitre.org/data/definitions/20.html) [OWASP:A06](https://owasp.org/Top10/A06_2021-Injection/) [CVSS:7.5](https://nvd.nist.gov/vuln-metrics/cvss/v3-calculator?vector=AV%3AN%2FAC%3AL%2FPR%3AN%2FUI%3AN%2FS%3AU%2FC%3AH%2FI%3AH%2FA%3AH) |
| **Issue Description**     | Specific vulnerability | `Improper Input Validation detected`                                                                                                                                                                                                                        |
| **Severity & Compliance** | Impact assessment      | `HIGH [SOC2,PCI-DSS,HIPAA,GDPR,ISO27001]`                                                                                                                                                                                                                   |
| **Fix Instruction**       | Actionable remediation | `Follow the remediation steps below`                                                                                                                                                                                                                        |
| **Technical Truth**       | Official reference     | [OWASP Top 10](https://owasp.org/Top10/A06_2021-Injection/)                                                                                                                                                                                                 |

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

  // Scan the project's module and bootstrap files for an app-wide pipe
  // (APP_PIPE / app.useGlobalPipes) and stay silent when one exists
  // (default: true)
  detectGlobalPipes?: boolean;

  // Assume a global pipe without scanning (default: false)
  assumeGlobalPipes?: boolean;

  // Require an explicit per-route pipe even where a global one would validate
  // the input. Off by default: the rule reports only shapes no ValidationPipe
  // can validate — missing annotation, any, unknown, object, inline type
  // literals (default: false)
  requireExplicitPipe?: boolean;
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

## Cross-File Detection

### Registered app-wide

The rule scans the project's module and bootstrap files and stays silent when it
finds an app-wide registration, so this is _not_ a false positive:

```typescript
// main.ts
app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
```

Turn the scan off with `detectGlobalPipes: false` if you want the routes reported anyway.
What the scan still cannot resolve is a registration built at runtime or
supplied by a library — `assumeGlobalPipes: true` covers those.

## Known False Negatives

The following patterns are **not detected** due to static analysis limitations:

### Conditional Pipe Application

**Why**: Pipes applied conditionally are not tracked.

```typescript
// ❌ NOT DETECTED - Conditional validation
if (process.env.NODE_ENV === 'production') {
  app.useGlobalPipes(new ValidationPipe());
}
```

**Mitigation**: Always apply validation unconditionally.

### Custom Validation Decorators

**Why**: Custom decorators wrapping validation are not recognized.

```typescript
// ❌ NOT DETECTED - Custom decorator includes validation
@CustomValidated() // Internally uses ValidationPipe
class MyController {}
```

**Mitigation**: Document custom decorators. Use standard @UsePipes.

### Module-Level Providers

**Why**: Validation pipes as providers are not detected.

```typescript
// ❌ NOT DETECTED - Pipe as module provider
@Module({
  providers: [{ provide: APP_PIPE, useClass: ValidationPipe }]
})
```

**Mitigation**: Configure assumeGlobalPipes for modules with APP_PIPE provider.
