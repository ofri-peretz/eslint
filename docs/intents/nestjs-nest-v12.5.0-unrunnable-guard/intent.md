---
slug: nestjs-nest-v12.5.0-unrunnable-guard
opened: 2026-11-13
packages:
  - eslint-plugin-nestjs-security
cases: []
---

# Intent — a guard NestJS cannot run does not count as a guard

> Stage 1 artifact. Opened by the NestJS release watch on reading nest v12.5.0
> and v11.2.10.

**Status:** draft · **Opened:** 2026-11-13 · **Owner:** @ofri-peretz

---

## What is wanted

`require-guards` does not accept `@UseGuards(X)` as protection when the source
shows that `X` cannot run as a guard: `X` is a function that returns the guard
class (a factory passed without being called), or a class with no `canActivate`
of its own (an abstract class used as a token). The route is reported, with a
message that names the binding and the fix.

## Why now

[nest v12.5.0](https://github.com/nestjs/nest/releases/tag/v12.5.0) and
[v11.2.10](https://github.com/nestjs/nest/releases/tag/v11.2.10) both carry
"throw for a guard, interceptor or pipe that can't run"
([7a81aed500](https://github.com/nestjs/nest/commit/7a81aed500ac8dcdf1733ccd7c5d167129c4887d)).
Read at the v12.5.0 tag:

- `packages/core/helpers/context-creator.ts` lines 61-73, `pickEnhancer`: when
  neither the instance nor the class has the method, it returns the instance as
  it is. Before this release nothing looked at that value again, and the
  consumer skipped it, so the handler ran without the guard.
- `packages/core/guards/guards-context-creator.ts`, `getGuardInstance`: the
  release adds `assertEnhancer(enhancer, 'guard', …)` after `pickEnhancer`.
- `packages/core/helpers/assert-enhancer.ts` lines 20-29 (new file): throws
  `InvalidEnhancerException` unless the value has a `canActivate` function.

So on every NestJS before 12.5.0 and 11.2.10, the two shapes below start, serve
requests, and enforce nothing. On the patched versions the application does not
start. Either way the binding is a defect the source shows.

The failing fixture, linted with `require-guards` from `origin/main`
(`detectGlobalGuards: false`):

```ts
import { Controller, Get, UseGuards, mixin } from '@nestjs/common';
export function RoleGuard(role: string) {
  class RoleGuardMixin {
    canActivate() {
      return role === 'admin';
    }
  }
  return mixin(RoleGuardMixin);
}
export abstract class AuthPort {
  abstract canActivate(): boolean;
}
@Controller('users')
export class UsersController {
  @UseGuards(RoleGuard) @Get('a') a() {} // line 10: not reported
  @UseGuards(AuthPort) @Get('b') b() {} // line 11: not reported
  @Get('c') c() {} // line 12: missingGuards
}
```

Output: `[ '12: missingGuards' ]`. Lines 10 and 11 are unguarded on NestJS up to
12.4.x and 11.2.9 and the rule says nothing.

## Affected users and systems

Users of `require-guards` in `eslint-plugin-nestjs-security` (and its Oxlint
twin). The rule doc, its generated page, the rule's fidelity model
(`benchmarks/suites/fidelity/models/nestjs-security/require_guards.*`).

## Constraints

- No new dependency, and type-unaware.
- Decided from what the binding is (a function declaration, a class body), never
  from its name: `RoleGuard` is a class in one project and a factory in another.
- A binding the rule cannot follow to a declaration stays accepted, as today. A
  guess that a guard cannot run would report correctly guarded routes.
- No existing report is lost.

## Success criteria

- The fixture above reports lines 10, 11 and 12.
- `npx vitest run --config vitest.config.mts` in the plugin: green at 100%.
- `npm run fidelity -- nestjs-security/require_guards`: 0 failing, full domain.
- `npm run mutation -- --plugin nestjs-security --rules require-guards`: no
  survivor.
- The corpus scan (79 repositories) adds no finding that, read in its file, is a
  guard that does run.

## Open questions

1. A guard factory is almost always declared in its own file and imported by the
   controller. `require-guards` follows `extends` within one file and nothing
   across files; the project scan in `utils/project-context.ts` follows relative
   imports, but by text. Reading the declaration behind an imported binding
   needs either a parse of the imported file inside the rule or a new text scan.
   Which one is a design decision with a cost in lint time, and it is Ofri's.
2. An arrow-function factory (`const RoleGuard = (role) => mixin(…)`) cannot be
   called with `new`, so NestJS fails at startup on every version. Whether that
   loud failure belongs in a security rule's report is undecided.
3. A class whose `canActivate` comes from a base class in another file cannot be
   told apart from one that has none without the same cross-file read.
4. The same release makes `useValue: SomeGuardClass` under `APP_GUARD` and
   `app.useGlobalGuards(SomeGuardClass)` fail at startup. The project scan
   counts both as a global guard today. Not verified against a fixture in this
   run.
