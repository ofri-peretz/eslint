# Design — a guard NestJS cannot run does not count as a guard

Intent: [`intent.md`](./intent.md). **Status:** approved.

---

## Requirements

- **R1** `@UseGuards(X)` where `X` is bound, in the linted file, to a function
  declaration or a `function` expression that every `return` shows returns a
  guard class (`mixin(C)`, a class expression, or a local class) is reported.
  A function that assigns `this.canActivate`, carries a `canActivate`
  property, or returns anything the file cannot classify is accepted: NestJS
  can run either shape.
- **R2** `@UseGuards(X)` where `X` is bound, in the linted file, to a class with
  no `extends`, no non-abstract member named `canActivate`, and a constructor
  that cannot install one is reported. A constructor that assigns to `this`
  (`this.canActivate = …`, `this[k] = …`) or passes `this` to any call
  (`Object.assign(this, …)`) makes the class unresolved, and it is accepted.
- **R3** R1 and R2 hold when `X` is imported from a relative module that
  declares it, once open question 1 of the intent is settled.
- **R4** A called factory (`RoleGuard('admin')`), `new X()`, a class that extends
  anything, and a binding with no visible declaration are accepted as today.
- **R5** The message names `X`, says the handlers run without it on NestJS
  before 12.5.0 / 11.2.10 and that later versions throw
  `InvalidEnhancerException` (at startup for a singleton route, on the first
  request for a request-scoped one), and gives the fix for the shape found.

## Design

`packages/eslint-plugin-nestjs-security/src/rules/require-guards/index.ts`.

`guardNames()` maps each `@UseGuards` argument to a name with `expressionName`.
Add a second pass over the same arguments that, for a bare identifier, resolves
the binding from the decorator's own lexical scope (`sourceCode.getScope` on the
argument, walking `upper`), so a local guard that shadows a module-level one
decides, and classes it as `factory`, `noCanActivate`, `runnable` or
`unresolved`. A route whose every applied guard is unrunnable is treated as
unguarded; each unrunnable binding is reported where it is applied.

New reports:

- `uncalledGuardFactory` — `@UseGuards(RoleGuard)` with
  `function RoleGuard(role) { return mixin(…) }`. Fix text: call it,
  `@UseGuards(RoleGuard('admin'))`.
- `guardWithoutCanActivate` — `@UseGuards(AuthPort)` with
  `abstract class AuthPort { abstract canActivate(): boolean }`. Fix text: bind
  the class that implements it; NestJS constructs what the decorator is given
  and does not look up a provider registered under it.

Removed reports: none.

Silencing: no new option. The binding is wrong on every NestJS version, so the
way to silence it is to fix it; an inline `eslint-disable-next-line` covers the
case this design did not foresee.

Fidelity model: `require_guards.qnt` gains a `Binding` dimension
(`ClassWithMethod | ClassExtends | AbstractNoMethod | FactoryUncalled |
FactoryCalled | Unresolved`) crossed with the existing guard placement
(class, method). `.cjs` renders each as a declaration in the controller file.

Tests: one invalid case per report and per placement; valid cases for R4,
including a class with `canActivate` as a property (`canActivate = () => true`)
and a class with a static-only `canActivate`.

## Verification

`npx vitest run --config vitest.config.mts src/rules/require-guards` in the
plugin, then the fidelity, mutation and corpus commands in the intent's success
criteria. The fixture in the intent is the test that fails today.

## Rejected alternatives

- **Decide from the name** (`*Factory`, lower-case first letter). Forbidden
  here, and wrong: mixin factories are conventionally PascalCase.
- **A separate rule.** The finding is "this route is unguarded"; a second rule
  would report it while `require-guards` stays silent on the same line.
- **Type-aware detection** of "has no `canActivate`". Exact, but the rule is
  type-unaware and the two declaration shapes cover what the release describes.
- **Report every imported guard the rule cannot resolve.** Would report most
  correctly guarded routes in any real project.

## Out of scope

Interceptors and pipes that cannot run (same NestJS change, no rule of ours
requires one by binding). `APP_GUARD` `useValue`/`useFactory` and
`useGlobalGuards()` given a class (intent open question 4).
