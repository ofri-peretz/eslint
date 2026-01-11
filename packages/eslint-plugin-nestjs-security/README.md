# eslint-plugin-nestjs-security

> 🔐 Security-focused ESLint plugin for NestJS applications. Detects missing guards, validation pipes, throttling, and exposed private fields with AI-optimized fix guidance.

[![npm version](https://img.shields.io/npm/v/eslint-plugin-nestjs-security.svg)](https://www.npmjs.com/package/eslint-plugin-nestjs-security)
[![npm downloads](https://img.shields.io/npm/dm/eslint-plugin-nestjs-security.svg)](https://www.npmjs.com/package/eslint-plugin-nestjs-security)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![codecov](https://codecov.io/gh/ofri-peretz/eslint/graph/badge.svg?component=nestjs_security)](https://app.codecov.io/gh/ofri-peretz/eslint/components?components%5B0%5D=nestjs_security)
[![Dec 2025](https://img.shields.io/badge/Dec_2025-blue?logo=rocket&logoColor=white)](https://github.com/ofri-peretz/eslint)

> **NestJS-first security:** This plugin provides comprehensive security rules for **NestJS** applications.
> With **5 security rules** mapped to OWASP Top 10, CWE and CVSS, it transforms your linter into a NestJS security auditor that AI assistants can understand and fix.

---

## 💡 What you get

- **NestJS-focused coverage:** 5 rules targeting NestJS-specific vulnerabilities (guards, validation, throttling, serialization).
- **LLM-optimized & MCP-ready:** Structured 2-line messages with CWE + OWASP + CVSS + concrete fixes so humans _and_ AI auto-fixers stay aligned.
- **Standards aligned:** OWASP Top 10 Web 2021, CWE tagging, CVSS scoring in every finding for compliance mapping.
- **Tiered presets:** `recommended`, `strict` for fast policy rollout.
- **Decorator-aware:** Detects @UseGuards, @UsePipes, @Throttle, @Exclude, class-validator decorators.
- **Low false positive rate:** Context-aware detection with production heuristics.

Every security rule produces a **structured 2-line error message**:

```bash
src/users/users.controller.ts
  18:5   error  🔒 CWE-284 OWASP:A01 CVSS:9.8 | Missing Authorization Guards | CRITICAL [SOC2,PCI-DSS]
                    Fix: Add @UseGuards(AuthGuard): @UseGuards(AuthGuard) before the handler | https://docs.nestjs.com/...
```

**Each message includes:**

- 🔒 **CWE reference** - vulnerability classification
- 📋 **OWASP category** - Top 10 mapping
- 📊 **CVSS score** - severity rating (0.0-10.0)
- 🏢 **Compliance tags** - affected frameworks (SOC2, PCI-DSS, HIPAA)
- ✅ **Fix instruction** - exact code to write
- 📚 **Documentation link** - learn more

---

## 📊 OWASP Top 10 Coverage Matrix

| OWASP Category                | Coverage | Rule | CWE | OWASP | CVSS | Description | 💼 | ⚠️ | 🔧 | 💡 | 🚫 |
| :--- | :---: | :---: | :---: | :--- | :---: | :---: | :---: | :---: | :---: |
| **A01:2021** Access Control |  |  |  |  |  |  |  |  |  |
| **A03:2021** Injection |  |  |  |  |  |  |  |  |  |
| **A05:2021** Misconfiguration |  |  |  |  |  |  |  |  |  |
> [!TIP]
> For **complete OWASP coverage**, combine with [`eslint-plugin-secure-coding`](https://www.npmjs.com/package/eslint-plugin-secure-coding) which provides 78 additional rules covering all OWASP categories.

---

## 🔐 5 Security Rules

💼 = Set in `recommended` | ⚠️ = Warns in `recommended` | 🔧 = Auto-fixable | 💡 = Suggestions

### Authorization & Access Control (2 rules)

| Rule | CWE | OWASP | CVSS | Description | 💼 | ⚠️ | 🔧 | 💡 | 🚫 |
| :--- | :---: | :---: | :---: | :--- | :---: | :---: | :---: | :---: | :---: |
| [require-guards](#require-guards) | CWE-284 | A01 | 9.8 | Require @UseGuards on controllers | 💼 |  |  | 💡 |  |
| [no-exposed-private-fields](#no-exposed-private-fields) | CWE-200 | A01 | 7.5 | Detect exposed sensitive fields in DTOs | 💼 |  |  | 💡 |  |
### Input Validation (2 rules)

| Rule | CWE | OWASP | CVSS | Description | 💼 | ⚠️ | 🔧 | 💡 | 🚫 |
| :--- | :---: | :---: | :---: | :--- | :---: | :---: | :---: | :---: | :---: |
| [no-missing-validation-pipe](#no-missing-validation-pipe) | CWE-20 | A03 | 8.6 | Require ValidationPipe for DTOs | 💼 |  |  | 💡 |  |
| [require-class-validator](#require-class-validator) | CWE-20 | A03 | 7.5 | Require class-validator decorators |  | ⚠️ |  | 💡 |  |
### Rate Limiting & DoS (1 rule)

| Rule | CWE | OWASP | CVSS | Description | 💼 | ⚠️ | 🔧 | 💡 | 🚫 |
| :--- | :---: | :---: | :---: | :--- | :---: | :---: | :---: | :---: | :---: |
| [require-throttler](#require-throttler) | CWE-770 | A05 | 7.5 | Require ThrottlerGuard/rate limit |  | ⚠️ |  | 💡 |  |
---

## 🔍 Rule Details

### `require-guards`

Requires @UseGuards decorator on controllers or route handlers for access control.

**❌ Incorrect**

```typescript
@Controller('users')
class UsersController {
  @Get()
  findAll() {} // No authentication/authorization
}
```

**✅ Correct**

```typescript
import { UseGuards } from '@nestjs/common';
import { AuthGuard } from './auth.guard';

@Controller('users')
@UseGuards(AuthGuard) // Class-level protection
class UsersController {
  @Get()
  findAll() {}
}

// Or method-level
@Controller('users')
class UsersController {
  @Get()
  @UseGuards(AuthGuard) // Method-level protection
  findAll() {}
}
```

---

### `no-missing-validation-pipe`

Requires ValidationPipe for DTO input parameters to prevent injection attacks.

**❌ Incorrect**

```typescript
@Controller('users')
class UsersController {
  @Post()
  create(@Body() dto: CreateUserDto) {} // No validation
}
```

**✅ Correct**

```typescript
import { UsePipes, ValidationPipe } from '@nestjs/common';

@Controller('users')
@UsePipes(new ValidationPipe()) // Class-level
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

---

### `require-throttler`

Requires ThrottlerGuard or @Throttle decorator to prevent DoS and brute-force attacks.

**❌ Incorrect**

```typescript
@Controller('auth')
class AuthController {
  @Post('login')
  login() {} // No rate limiting - vulnerable to brute force
}
```

**✅ Correct**

```typescript
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';

@Controller('auth')
@UseGuards(ThrottlerGuard)
class AuthController {
  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 attempts per minute
  login() {}
}

// Or in app.module.ts (global)
@Module({
  imports: [ThrottlerModule.forRoot([{ ttl: 60000, limit: 10 }])],
})
export class AppModule {}
```

---

### `no-exposed-private-fields`

Detects sensitive fields in DTOs/entities that are not excluded from serialization.

**❌ Incorrect**

```typescript
@Entity()
class User {
  id: string;
  email: string;
  password: string; // Exposed in API responses!
}
```

**✅ Correct**

```typescript
import { Exclude } from 'class-transformer';

@Entity()
class User {
  id: string;
  email: string;

  @Exclude()
  password: string;  // Hidden from API responses
}

// Make sure to use ClassSerializerInterceptor
@UseInterceptors(ClassSerializerInterceptor)
@Controller('users')
class UsersController { ... }
```

---

### `require-class-validator`

Requires class-validator decorators on DTO properties for input validation.

**❌ Incorrect**

```typescript
class CreateUserDto {
  name: string; // No validation
  email: string; // No validation
}
```

**✅ Correct**

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

---

## 🚀 Quick Start

### ESLint Flat Config (Recommended)

```javascript
// eslint.config.js
import nestjsSecurity from 'eslint-plugin-nestjs-security';

export default [
  nestjsSecurity.configs.recommended,
  // ... other configs
];
```

### Strict Mode

```javascript
import nestjsSecurity from 'eslint-plugin-nestjs-security';

export default [nestjsSecurity.configs.strict];
```

---

## 📋 Available Presets

| Preset            | Description                                                            |
| ----------------- | ---------------------------------------------------------------------- |
| **`recommended`** | Balanced security for NestJS projects (critical as error, others warn) |
| **`strict`**      | Maximum security enforcement (all rules as errors)                     |

---

## ⚠️ Global Configuration Handling

> **Static Analysis Limitation:** ESLint analyzes files independently. It cannot detect cross-file configurations like `app.useGlobalGuards()` in `main.ts` while linting `users.controller.ts`.

### Understanding the Problem

NestJS supports two security configuration approaches:

| Approach             | Example                                           | ESLint Can See? |
| -------------------- | ------------------------------------------------- | :-------------: |
| **Per-Controller**   | `@UseGuards(AuthGuard)` on class                  |       ✅        |
| **Per-Method**       | `@UseGuards(AuthGuard)` on method                 |       ✅        |
| **Global (main.ts)** | `app.useGlobalGuards(new AuthGuard())`            |       ❌        |
| **Global (Module)**  | `ThrottlerModule.forRoot({ ttl: 60, limit: 10 })` |       ❌        |

### Solution: `assumeGlobal*` Options

For teams using **global configuration**, set `assumeGlobal*: true` to disable per-file checks:

```javascript
// eslint.config.js
import nestjsSecurity from 'eslint-plugin-nestjs-security';

export default [
  {
    ...nestjsSecurity.configs.recommended,
    rules: {
      // Tell ESLint: "We have app.useGlobalGuards() in main.ts"
      'nestjs-security/require-guards': ['warn', { assumeGlobalGuards: true }],

      // Tell ESLint: "We have app.useGlobalPipes(new ValidationPipe()) in main.ts"
      'nestjs-security/no-missing-validation-pipe': [
        'warn',
        { assumeGlobalPipes: true },
      ],

      // Tell ESLint: "We have ThrottlerModule.forRoot() in app.module.ts"
      'nestjs-security/require-throttler': [
        'warn',
        { assumeGlobalThrottler: true },
      ],
    },
  },
];
```

### Alternative: Use Skip Decorators

The rules recognize common "bypass" decorators for intentionally unprotected endpoints:

```typescript
// These bypass require-guards
@Public()        // nestjs-passport pattern
@SkipAuth()      // common custom decorator
@AllowAnonymous() // alternative naming
@NoAuth()        // alternative naming

// These bypass require-throttler
@SkipThrottle()  // @nestjs/throttler built-in
```

### Configuration Matrix

| Rule | CWE | OWASP | CVSS | Description | 💼 | ⚠️ | 🔧 | 💡 | 🚫 |
| :--- | :---: | :---: | :---: | :--- | :---: | :---: | :---: | :---: | :---: |
| `require-guards` |  |  |  |  |  |  |  |  |  |
| `no-missing-validation-pipe` |  |  |  |  |  |  |  |  |  |
| `require-throttler` |  |  |  |  |  |  |  |  |  |
| `require-class-validator` |  |  |  |  |  |  |  |  |  |
| `no-exposed-private-fields` |  |  |  |  |  |  |  |  |  |
### 🔮 Future: Cross-File Global Detection (Planned)

We're planning dedicated rules to **verify** global configuration exists:

- `require-global-guards` → Ensures `main.ts` contains `app.useGlobalGuards()`
- `require-global-validation-pipe` → Ensures `main.ts` contains `app.useGlobalPipes()`
- `require-global-throttler` → Ensures `app.module.ts` imports `ThrottlerModule`

This will enable a "trust but verify" approach for teams using global configuration.

---

## 🏢 Enterprise Integration Example

```javascript
// eslint.config.js
import nestjsSecurity from 'eslint-plugin-nestjs-security';

export default [
  // Baseline for all NestJS apps
  nestjsSecurity.configs.recommended,

  // Strict mode for payment/auth services
  {
    files: ['src/auth/**', 'src/payments/**'],
    ...nestjsSecurity.configs.strict,
  },
];
```

---

## 🤖 LLM & AI Integration

This plugin is optimized for ESLint's [Model Context Protocol (MCP)](https://eslint.org/docs/latest/use/mcp), enabling AI assistants like **Cursor**, **GitHub Copilot**, and **Claude** to:

- Understand the exact vulnerability type via CWE references
- Apply the correct fix using structured guidance
- Provide educational context to developers

```json
// .cursor/mcp.json
{
  "mcpServers": {
    "eslint": {
      "command": "npx",
      "args": ["@eslint/mcp@latest"]
    }
  }
}
```

---

## 🔗 Related ESLint Plugins

Part of the **Interlace ESLint Ecosystem** — AI-native security plugins with LLM-optimized error messages:

| Plugin                                                                                               |                                                                Downloads                                                                 | Description                                                  | Rule | CWE | OWASP | CVSS | Description | 💼 | ⚠️ | 🔧 | 💡 | 🚫 |
| :--- | :---: | :---: | :---: | :--- | :---: | :---: | :---: | :---: | :---: |
| [`eslint-plugin-secure-coding`](https://www.npmjs.com/package/eslint-plugin-secure-coding) |  |  |  |  |  |  |  |  |  |
| [`eslint-plugin-express-security`](https://www.npmjs.com/package/eslint-plugin-express-security) |  |  |  |  |  |  |  |  |  |
| [`eslint-plugin-lambda-security`](https://www.npmjs.com/package/eslint-plugin-lambda-security) |  |  |  |  |  |  |  |  |  |
| [`eslint-plugin-browser-security`](https://www.npmjs.com/package/eslint-plugin-browser-security) |  |  |  |  |  |  |  |  |  |
| [`eslint-plugin-jwt`](https://www.npmjs.com/package/eslint-plugin-jwt) |  |  |  |  |  |  |  |  |  |
| [`eslint-plugin-crypto`](https://www.npmjs.com/package/eslint-plugin-crypto) |  |  |  |  |  |  |  |  |  |
| [`eslint-plugin-pg`](https://www.npmjs.com/package/eslint-plugin-pg) |  |  |  |  |  |  |  |  |  |
| [`eslint-plugin-vercel-ai-security`](https://www.npmjs.com/package/eslint-plugin-vercel-ai-security) |  |  |  |  |  |  |  |  |  |
| [`eslint-plugin-import-next`](https://www.npmjs.com/package/eslint-plugin-import-next) |  |  |  |  |  |  |  |  |  |
---

## 🔒 Privacy

This plugin runs **100% locally**. No data ever leaves your machine.

---

## 📄 License

MIT © [Ofri Peretz](https://github.com/ofri-peretz)
