# AGENTS.md

> Context for AI coding agents working on eslint-plugin-nestjs-security

## Setup Commands

```bash
# Install dependencies (from monorepo root)
npm install

# Build this package
nx build eslint-plugin-nestjs-security

# Run tests
nx test eslint-plugin-nestjs-security

# Run tests with coverage
nx test eslint-plugin-nestjs-security --coverage

# Lint this package
nx lint eslint-plugin-nestjs-security
```

## Code Style

- TypeScript strict mode with `@interlace/eslint-devkit` types
- Use `AST_NODE_TYPES` constants, never string literals for node types
- Use `formatLLMMessage()` for all rule error messages
- Include CWE, CVSS, OWASP in every security message
- Use `c8 ignore` comments with documented reasons for untestable code
- Decorator-aware detection for NestJS patterns

## Testing Instructions

- Tests use `@typescript-eslint/rule-tester` with Vitest
- Each rule has `index.ts` (implementation) and `index.spec.ts` (tests) in same directory
- Run specific rule test: `nx test eslint-plugin-nestjs-security --testPathPattern="require-guards"`
- Coverage target: ≥90% lines, ≥95% functions
- All tests must pass before committing

## Project Structure

```
src/
├── index.ts          # Plugin entry, exports rules and 2 configs
├── utils/            # Shared helpers
│   ├── decorators.ts      # Decorator naming + known/unresolved classification
│   └── project-context.ts # Cross-file global registration discovery (cached)
└── rules/            # 6 rule directories
    └── [rule-name]/
        ├── index.ts       # Rule implementation
        └── index.spec.ts  # Rule tests
docs/                 # Documentation
```

## Plugin Purpose

Security-focused ESLint plugin with **6 rules** for NestJS applications. Covers authorization guards, validation pipes, throttling/rate limiting, class-validator decorators, and sensitive field exposure.

## Rule Categories

| Category         | Rules                                                   | CWEs     |
| ---------------- | ------------------------------------------------------- | -------- |
| Authorization    | `require-guards`, `no-exposed-private-fields`           | 200, 284 |
| Input Validation | `no-missing-validation-pipe`, `require-class-validator` | 20       |
| Rate Limiting    | `require-throttler`                                     | 770      |

## Common Fix Patterns

```typescript
// Guards
// BAD: @Controller('users') class UsersController { @Get() findAll() {} }
// GOOD: @Controller('users') @UseGuards(AuthGuard) class UsersController { @Get() findAll() {} }

// Validation Pipe
// BAD: @Controller('users') class { @Post() create(@Body() dto: CreateUserDto) {} }
// GOOD: @Controller('users') @UsePipes(new ValidationPipe()) class { @Post() create(@Body() dto) {} }

// Class Validator
// BAD: class CreateUserDto { name: string; email: string; }
// GOOD: class CreateUserDto { @IsString() @IsNotEmpty() name: string; @IsEmail() email: string; }

// Throttler
// BAD: @Controller('auth') class { @Post('login') login() {} }
// GOOD: @Controller('auth') @UseGuards(ThrottlerGuard) class { @Post('login') @Throttle({ default: { limit: 5, ttl: 60000 } }) login() {} }

// Exposed Fields
// BAD: @Entity() class User { password: string; }
// GOOD: @Entity() class User { @Exclude() password: string; }
```

## Global Configuration Handling

NestJS applies guards, pipes and throttling app-wide through DI, in a file the
controller never imports. `src/utils/project-context.ts` discovers those
registrations: it resolves the project root (nearest `package.json`), scans
`main.ts` / `*.module.ts` once, and caches the result per root.

Detected: `{ provide: APP_GUARD|APP_PIPE|APP_INTERCEPTOR|APP_FILTER }`,
`app.useGlobalPipes()`, `app.useGlobalGuards()`, `ThrottlerModule.forRoot(Async)`.
A `ThrottlerGuard` registered as `APP_GUARD` counts as throttling, not auth.

The `assumeGlobal*` options still force-skip a rule without scanning; the new
`detectGlobal*: false` options disable the scan and restore strict per-file
checking.

## False-positive doctrine

`src/utils/decorators.ts` holds `KNOWN_DECORATORS` — every decorator shipped by
NestJS, Swagger, class-validator and class-transformer. **Anything not in that
set is treated as project-owned and possibly a guard composite**
(`applyDecorators(UseGuards(...))`), so `require-guards` and
`no-exposed-debug-endpoints` stay silent on it. A false negative is far cheaper
than a false positive on somebody else's codebase.

Never add a wildcard to that set. An `Api*` prefix heuristic would swallow ack's
`@ApiKeyProtected()`, which is a guard, not Swagger documentation.

## Recognized Decorators

| Rule                | Skip Decorators                                              |
| ------------------- | ------------------------------------------------------------ |
| `require-guards`    | @Public, @IsPublic, @SkipAuth, @AllowAnonymous, @Anonymous, @NoAuth, any unresolved decorator |
| `require-throttler` | reports only on the root module; no per-route decorators      |

## Security Considerations

- All rules map to OWASP Top 10 2021: A01, A03, A05
- CWE coverage: 20, 200, 284, 770
