---
title: 'Getting Started with eslint-plugin-nestjs-security'
published: true
description: 'NestJS security in 60 seconds. 5 rules for guards, validation, and rate limiting.'
tags: nestjs, eslint, security, nodejs
cover_image:
series: Getting Started
---

**5 NestJS security rules. Guards, validation, throttling.**

> This plugin is for **Node.js teams** building APIs with [NestJS](https://nestjs.com/).

## Quick Install

```bash
npm install --save-dev eslint-plugin-nestjs-security
```

## Flat Config

```javascript
// eslint.config.js
import nestjsSecurity from 'eslint-plugin-nestjs-security';

export default [nestjsSecurity.configs.recommended];
```

## Rule Overview

| Rule                         | What it catches                        |
| ---------------------------- | -------------------------------------- |
| `require-guards`             | Controllers without @UseGuards         |
| `require-class-validator`    | DTOs without validation decorators     |
| `require-throttler`          | Auth endpoints without rate limiting   |
| `no-exposed-private-fields`  | Entities without @Exclude on sensitive |
| `no-missing-validation-pipe` | @Body without ValidationPipe           |

## Run ESLint

```bash
npx eslint .
```

You'll see output like:

```bash
src/users/users.controller.ts
  12:1  error  🔒 Controller missing @UseGuards decorator
               Fix: Add @UseGuards(AuthGuard) to the controller or method

src/auth/dto/login.dto.ts
  8:3   error  🔒 DTO property 'password' missing validation decorator
               Fix: Add @IsString() @MinLength(8) decorators

src/users/entities/user.entity.ts
  15:3  error  🔒 Sensitive field 'password' not excluded from serialization
               Fix: Add @Exclude() decorator from class-transformer
```

## Quick Wins

### Guards

```typescript
// ❌ Unprotected controller
@Controller('users')
export class UsersController {
  @Get()
  findAll() { ... }
}

// ✅ Protected with guards
@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  @Get()
  findAll() { ... }
}
```

### DTO Validation

```typescript
// ❌ No validation
export class CreateUserDto {
  email: string;
  password: string;
}

// ✅ Validated DTO
export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;
}
```

## Custom Configuration

```javascript
// eslint.config.js
import nestjsSecurity from 'eslint-plugin-nestjs-security';

export default [
  nestjsSecurity.configs.recommended,
  {
    rules: {
      // Only require guards on specific routes
      'nestjs-security/require-guards': [
        'error',
        {
          excludePatterns: ['health', 'public'],
        },
      ],

      // Warn instead of error for throttling
      'nestjs-security/require-throttler': 'warn',
    },
  },
];
```

## Strongly-Typed Options (TypeScript)

```typescript
// eslint.config.ts
import nestjsSecurity, {
  type RuleOptions,
} from 'eslint-plugin-nestjs-security';

const guardOptions: RuleOptions['require-guards'] = {
  excludePatterns: ['health', 'metrics'],
  requireOnMethods: ['POST', 'PUT', 'DELETE'],
};

export default [
  nestjsSecurity.configs.recommended,
  {
    rules: {
      'nestjs-security/require-guards': ['error', guardOptions],
    },
  },
];
```

## Quick Reference

```bash
# Install
npm install --save-dev eslint-plugin-nestjs-security

# Config (eslint.config.js)
import nestjsSecurity from 'eslint-plugin-nestjs-security';
export default [nestjsSecurity.configs.recommended];

# Run
npx eslint .
```

---

📦 [npm: eslint-plugin-nestjs-security](https://www.npmjs.com/package/eslint-plugin-nestjs-security)
📖 [Full Rule List](https://github.com/ofri-peretz/eslint/tree/main/packages/eslint-plugin-nestjs-security/docs/rules)

{% cta https://github.com/ofri-peretz/eslint %}
⭐ Star on GitHub
{% endcta %}

---

🚀 **Building with NestJS? Run the linter!**

[GitHub](https://github.com/interlace-collie) | [X](https://x.com/ofriperetzdev) | [LinkedIn](https://linkedin.com/in/ofri-peretz) | [Dev.to](https://dev.to/ofriperetz)
