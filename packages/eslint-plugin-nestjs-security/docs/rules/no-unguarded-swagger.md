---
title: no-unguarded-swagger
description: This rule detects SwaggerModule.setup() running unconditionally in an application bootstrap, which publishes every route, DTO shape and declared auth scheme to anonymous callers in production.
tags: ['security', 'nestjs']
category: security
severity: medium
cwe: CWE-200
owasp: 'A01:2021'
autofix: false
---

> Detect `SwaggerModule.setup()` running unconditionally in an application bootstrap

<!-- @rule-summary -->

This rule detects `SwaggerModule.setup()` running unconditionally in an application bootstrap, which publishes every route, DTO shape and declared auth scheme to anonymous callers in production.

<!-- @/rule-summary -->

## Rule Details

Swagger UI publishes every route, every DTO shape, every example payload and the
declared authentication schemes. In development that is the entire point. Served
from production it is a free, machine-readable map of the attack surface, at a
fixed path, to anonymous callers — including the endpoints you have not
finished securing yet.

Measured across ten high-star NestJS codebases: **9 of 16** `SwaggerModule.setup`
calls run straight-line in `bootstrap()` with no environment check, across **4
repositories**. One of them is a code generator's `main.template.ts`, so the
shape is emitted into every service it produces.

## OWASP Mapping

- **OWASP Top 10 2021**: A01:2021 - Broken Access Control
- **CWE**: CWE-200 - Exposure of Sensitive Information to an Unauthorized Actor
- **CVSS**: 5.3 (Medium)

## ❌ Incorrect

```typescript
async function bootstrap() {
  const app = await NestFactory.create(ApplicationModule);
  const document = SwaggerModule.createDocument(app, options);
  SwaggerModule.setup('/docs', app, document); // served on every boot
  await app.listen(3000);
}
```

## ✅ Correct

```typescript
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  if (swaggerConfig.enabled) {
    const document = SwaggerModule.createDocument(app, options);
    SwaggerModule.setup(swaggerConfig.path ?? 'api', app, document);
  }

  await app.listen(3000);
}
```

## Options

| Option | Type | Default | Description |
| ------ | ---- | ------- | ----------- |
| `allowInTests` | `boolean` | `true` | Skip this rule in `*.test.*` / `*.spec.*` files |


```typescript
{
  // Skip rule in test files (default: true)
  allowInTests?: boolean;
}
```

## Scope

The rule reports only where it can see the whole bootstrap — a function that
also calls `NestFactory.create`. That distinction separated the 9 reportable
sites from 7 that are already correct.

Not reported:

```typescript
// Any condition at all. Gating on a config flag is as correct as gating on
// NODE_ENV, and the rule has no business arguing about which.
if (config.swagger.enabled) { SwaggerModule.setup(...); }
isDev && SwaggerModule.setup(...);

// A helper taking `app`. The guard lives at the call site, in another file —
// immich, awesome-nest-boilerplate and novu all do exactly this.
export function setupSwagger(app: INestApplication) {
  SwaggerModule.setup('docs', app, document);
}

// Building the document publishes nothing on its own.
const document = SwaggerModule.createDocument(app, options);
```

## When Not To Use It

- If the service is internal-only and its API surface is not sensitive.
- If Swagger is deliberately public — a documented developer portal, for
  instance. Disable the rule on that line rather than globally.

## Known False Negatives

### The guard is at the call site

**Why**: when Swagger is factored into a helper, whether it runs is decided by
the caller, which this rule cannot see. It abstains rather than accuse.

```typescript
// ❌ NOT DETECTED — and correctly so; the caller may or may not guard it
export function setupSwagger(app: INestApplication) {
  SwaggerModule.setup('docs', app, document);
}
```

**Mitigation**: check helper call sites by hand; there are few of them.

### A condition that is always true

**Why**: presence of a condition is enough to abstain. Proving it can be false
would mean evaluating it.

```typescript
// ❌ NOT DETECTED
if (true) {
  SwaggerModule.setup('docs', app, document);
}
```
