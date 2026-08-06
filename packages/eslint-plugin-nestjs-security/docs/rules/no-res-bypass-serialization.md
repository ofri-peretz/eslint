---
title: no-res-bypass-serialization
description: This rule detects route handlers that inject @Res() without passthrough and then write an object, which silently ...
tags: ['security', 'nestjs']
category: security
severity: high
cwe: CWE-200
owasp: 'A01:2021'
autofix: false
---

> Detect `@Res()` handlers that write objects past ClassSerializerInterceptor

<!-- @rule-summary -->

This rule detects route handlers that inject @Res() without passthrough and then write an object, which silently ...
<!-- @/rule-summary -->

## Rule Details

Injecting `@Res()` without `passthrough: true` switches a handler into
library-specific mode. Nest stops handling the response, so **no interceptor
runs on it** — and `ClassSerializerInterceptor` is an interceptor.

That means every `@Exclude()` on the object being written silently stops
applying. The password hash that is stripped on every other route is serialized
here, and nothing in the file says so.

This is NestJS-specific: it is not covered by any general-purpose security
plugin, because the vulnerability is in the framework's response pipeline rather
than in the code that writes the response.

## OWASP Mapping

- **OWASP Top 10 2021**: A01:2021 - Broken Access Control
- **CWE**: CWE-200 - Exposure of Sensitive Information to an Unauthorized Actor
- **CVSS**: 7.5 (High)

## ❌ Incorrect

```typescript
@Controller('users')
export class UsersController {
  @Get(':id')
  async findOne(@Param('id') id: string, @Res() res: Response) {
    // @Exclude() on UserEntity.password does NOT apply here.
    res.json(await this.usersService.findOne(id));
  }
}
```

## ✅ Correct

```typescript
@Controller('users')
export class UsersController {
  // Interceptors still run, so @Exclude() still applies.
  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    res.status(200);
    return this.usersService.findOne(id);
  }

  // Or drop @Res() entirely — the usual Nest handler.
  @Get()
  findAll() {
    return this.usersService.findAll();
  }
}
```

## Options

| Option | Type | Default | Description |
| ------ | ---- | ------- | ----------- |
| `allowInTests` | `boolean` | `true` | Skip this rule in `*.test.*` / `*.spec.*` files |
| `assumeGlobalSerializer` | `boolean` | `false` | Report even when no serializer is visible in the file |


```typescript
{
  // Skip rule in test files (default: true)
  allowInTests?: boolean;
  // Report even without a visible serializer (default: false)
  assumeGlobalSerializer?: boolean;
}
```

### When to set `assumeGlobalSerializer`

By default this rule only reports a handler whose controller (or the handler
itself) carries `@UseInterceptors(ClassSerializerInterceptor)` or
`@SerializeOptions()`. The reason is that the harm it names — `@Exclude()`
stops applying — needs a serializer to have been applying in the first place.

If your app registers the serializer globally, a controller file has no way to
know that, and the rule would stay silent on real findings:

```typescript
// main.ts — invisible from users.controller.ts
app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
```

```typescript
// app.module.ts — equally invisible
providers: [{ provide: APP_INTERCEPTOR, useClass: ClassSerializerInterceptor }];
```

If either of those is how you mount it, turn the option on:

```json
{
  "nestjs-security/no-res-bypass-serialization": [
    "error",
    { "assumeGlobalSerializer": true }
  ]
}
```

The default is `false` because the opposite failure is worse in practice. Run
at `error` against four production NestJS codebases, 23 of 27 findings were in
repos with no `ClassSerializerInterceptor` and no `@Exclude()` anywhere — every
one of them describing a leak that could not happen.

## Scope

The bypass is only a _disclosure_ risk when the handler writes an object.
Narrowing to that took the finding count across ten measured codebases from 95
to 23 — the other 72 were file streams, redirects and status literals, where
there is nothing to serialize.

Not reported:

```typescript
res.sendFile(path); // streams a file
res.redirect(url); // no body
res.status(200).send('ok'); // a string literal cannot carry @Exclude()
return this.service.run(res); // res handed off — this file cannot follow it
```

## When Not To Use It

- If the project does not use `ClassSerializerInterceptor` or `@Exclude()`
  anywhere, the bypass has nothing to bypass.

## Known False Negatives

### Response passed to a service

**Why**: When `res` is handed to another function, what gets written to it lives
in a different file.

```typescript
// ❌ NOT DETECTED - the write happens elsewhere
@Get('callback')
callback(@Res() res: Response) {
  return this.authService.complete(res);
}
```

**Mitigation**: Prefer `@Res({ passthrough: true })` as the project default.

### Writes through an aliased reference

**Why**: Only writes on the injected binding are tracked.

```typescript
// ❌ NOT DETECTED - rebound before the write
const out = res;
out.json(user);
```
