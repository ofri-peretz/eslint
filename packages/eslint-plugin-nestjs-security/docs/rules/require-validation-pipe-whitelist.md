---
title: require-validation-pipe-whitelist
description: Requires whitelist true on ValidationPipe, so properties the DTO never declared are stripped instead of reaching the service layer.
tags: ['security', 'nestjs']
category: security
severity: high
cwe: CWE-915
owasp: 'A03:2021'
autofix: false
---

> Requires whitelist: true on ValidationPipe so unknown properties are stripped

<!-- @rule-summary -->

Requires `whitelist: true` on `ValidationPipe`, so properties the DTO never declared are stripped instead of reaching the service layer.
<!-- @/rule-summary -->

## Rule Details

A `ValidationPipe` validates the properties a DTO declares. By default it does
not remove the ones it doesn't:

```ts
app.useGlobalPipes(new ValidationPipe()); // extras survive
app.useGlobalPipes(new ValidationPipe({ whitelist: true })); // extras stripped
```

So this request:

```http
POST /users
{ "email": "a@b.com", "password": "…", "isAdmin": true }
```

passes validation against a `CreateUserDto` that never mentions `isAdmin`, with
`isAdmin` still attached to the object. Any `repository.save(dto)` or
`{ ...dto }` downstream carries it into the record. That is mass assignment, and
the DTO looks like it prevented it.

`forbidNonWhitelisted: true` additionally turns the extra property into a `400`
rather than silently dropping it. Useful, but optional here — stripping is what
closes the hole, so only `whitelist` is required by default.

Measured on five real NestJS applications, three used a bare `new ValidationPipe()`.
The two that got it right were the most mature boilerplates in the set.

### Relationship to `no-missing-validation-pipe`

`no-missing-validation-pipe` asks whether a pipe exists at all. This rule asks
whether the pipe that exists actually strips anything.

## ❌ Incorrect

```ts
app.useGlobalPipes(new ValidationPipe());

app.useGlobalPipes(new ValidationPipe({ transform: true }));

new ValidationPipe({ whitelist: false });

class UserController {
  @UsePipes(new ValidationPipe())
  async create(@Body() dto: CreateUserDto) {}
}
```

## ✅ Correct

```ts
app.useGlobalPipes(new ValidationPipe({ whitelist: true }));

app.useGlobalPipes(
  new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
);

// Options declared elsewhere are not reported — see below
import validationOptions from './utils/validation-options';
app.useGlobalPipes(new ValidationPipe(validationOptions));
```

## What this rule deliberately does not report

- `new ValidationPipe(options)` where `options` is imported from another module.
  Well-factored applications do exactly this, and flagging them for being
  well-factored is how a rule gets switched off. Only same-file declarations are
  resolved.
- An options object containing a spread (`{ ...base }`), since `whitelist` may
  come from the spread.
- A variable that is **reassigned** after its declaration — only a binding
  written exactly once is read, since otherwise the declaration's value is not
  what reaches the call.

## Options

| Option | Type | Default | Description |
| ------ | ---- | ------- | ----------- |
| `allowInTests` | `boolean` | `true` | Skip this rule in `*.test.*` / `*.spec.*` files |
| `requireForbidNonWhitelisted` | `boolean` | `false` | Also require `forbidNonWhitelisted: true`, rejecting rather than stripping |


```ts
'nestjs-security/require-validation-pipe-whitelist': ['error', {
  allowInTests: true,
  requireForbidNonWhitelisted: false,
}]
```

| Option                        | Type      | Default | Description                                                                |
| ----------------------------- | --------- | ------- | -------------------------------------------------------------------------- |
| `allowInTests`                | `boolean` | `true`  | Skip `*.spec.ts` / `*.test.ts` / `*.e2e-spec.ts`                           |
| `requireForbidNonWhitelisted` | `boolean` | `false` | Also require `forbidNonWhitelisted: true`, rejecting rather than stripping |

## When Not To Use It

If a route deliberately accepts arbitrary properties — a generic webhook
receiver or a passthrough proxy. Disable it for that file rather than globally,
since the default is the safe one for every other endpoint.

## Further Reading

- [CWE-915: Improperly Controlled Modification of Dynamically-Determined Object Attributes](https://cwe.mitre.org/data/definitions/915.html)
- [NestJS — Stripping properties](https://docs.nestjs.com/techniques/validation#stripping-properties)
