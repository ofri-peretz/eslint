---
title: no-hybrid-app-config-loss
description: Detect connectMicroservice() without inheritAppConfig, which silently drops every global pipe and guard from the microservice transport
tags: ['security', 'nestjs']
category: security
severity: high
cwe: CWE-284
owasp: 'A01:2021'
autofix: false
---

> Detect `connectMicroservice()` without `inheritAppConfig`

<!-- @rule-summary -->

Detect connectMicroservice() without inheritAppConfig, which silently drops every global pipe and guard from the microservice transport.

<!-- @/rule-summary -->

## Rule Details

A hybrid application serves HTTP **and** a microservice transport from one
process. The two do not share configuration. Unless the second argument says
`inheritAppConfig: true`, every global pipe, guard, interceptor and filter
registered on the HTTP app is **absent** from the microservice's message
handlers.

The result is an application whose HTTP routes are validated and guarded, and
whose `@MessagePattern` handlers — reading from Kafka, RabbitMQ, Redis or gRPC —
are neither. Nothing in the code says so. The failure survives review because
both halves look correctly configured on their own: `main.ts` registers a global
`ValidationPipe`, and the microservice registration two lines below quietly opts
out of it.

Measured across both corpora: **11 `connectMicroservice` call sites in real
application code, and `inheritAppConfig` appears zero times.** Every hybrid
application measured is in the failing state. The only occurrences of the flag
anywhere are inside NestJS's own framework and its tests.

## OWASP Mapping

- **OWASP Top 10 2021**: A01:2021 - Broken Access Control
- **CWE**: CWE-284 - Improper Access Control
- **CVSS**: 7.5 (High)

## ❌ Incorrect

```typescript
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Everything below applies to HTTP only.
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));

  // …and this transport gets none of it.
  app.connectMicroservice<MicroserviceOptions>(createNestjsKafkaConfig());

  await app.startAllMicroservices();
  await app.listen(3000);
}
```

## ✅ Correct

```typescript
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));

  app.connectMicroservice<MicroserviceOptions>(createNestjsKafkaConfig(), {
    inheritAppConfig: true,
  });

  await app.startAllMicroservices();
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

Deliberately ungated. An earlier draft reported only where the project scan
found a global pipe or guard, but that silences on the _absence_ of evidence: a
project whose layout the scan cannot read would produce no findings and look
clean. A security rule that switches itself off scores a perfect false-positive
rate while protecting nothing, and it does so silently.

The gate also bought nothing. All 11 corpus call sites are in applications that
do register globals, so it never changed an answer. `connectMicroservice` is by
definition the hybrid API — a microservice-only process uses
`NestFactory.createMicroservice` — so an HTTP app is present by construction,
and adding `inheritAppConfig: true` is harmless even in the rare case it
inherits nothing.

Not reported:

```typescript
// A spread could carry the flag; its absence is not provable.
app.connectMicroservice(options, { ...hybridOptions });

// Hybrid options built elsewhere are not knowable from this file.
app.connectMicroservice(options, hybridOptions);

// A non-literal value could be true at runtime.
app.connectMicroservice(options, { inheritAppConfig: config.inherit });

// NestJS's own implementation of the API, rather than an application using it.
class NestApplication {
  connect(options) {
    return this.connectMicroservice(options);
  }
}
```

Reported, because the absence is stated outright:

```typescript
app.connectMicroservice(options, { inheritAppConfig: false });
```

## When Not To Use It

- If the microservice handlers deliberately run without the HTTP app's
  validation and guards — for example a transport that is only reachable inside
  a trusted network and validates its own payloads. Disable it on that line
  rather than globally, so the decision stays visible.

## Known False Negatives

### The flag is set on an options object built elsewhere

```typescript
// ❌ NOT DETECTED — and correctly so; the object may or may not set the flag
const hybridOptions = buildHybridOptions();
app.connectMicroservice(options, hybridOptions);
```

**Why**: proving the flag is absent would mean resolving the object across
files. Abstaining is the alternative to accusing correct code.
