---
title: 'NestJS Security: 5 Guards You Should Already Have'
published: false
description: 'NestJS has great security primitives. Most apps dont use them. Here are 5 required guards with ESLint enforcement.'
tags: nestjs, nodejs, security, eslint
cover_image:
series: NestJS Security
---

# NestJS Security: 5 Guards You Should Already Have

NestJS has built-in security patterns. Guards, pipes, decorators.

**Most apps don't use them correctly.**

## The 5 Required Security Patterns

### 1. Authentication Guard

```typescript
// ❌ No authentication check
@Controller('users')
export class UserController {
  @Get(':id')
  getUser(@Param('id') id: string) {
    return this.userService.findOne(id);
  }
}
```

```typescript
// ✅ With authentication guard
@Controller('users')
@UseGuards(AuthGuard('jwt'))
export class UserController {
  @Get(':id')
  getUser(@Param('id') id: string) {
    return this.userService.findOne(id);
  }
}
```

### 2. Validation Pipe

```typescript
// ❌ No input validation
@Post()
createUser(@Body() createUserDto: any) {
  return this.userService.create(createUserDto);
}
```

```typescript
// ✅ Class-validator with pipe
import { ValidationPipe } from '@nestjs/common';
import { IsEmail, IsString, MinLength } from 'class-validator';

class CreateUserDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsEmail()
  email: string;
}

@Post()
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
createUser(@Body() createUserDto: CreateUserDto) {
  return this.userService.create(createUserDto);
}
```

### 3. Rate Limiting

```typescript
// ❌ No rate limiting
@Controller('auth')
export class AuthController {
  @Post('login')
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }
}
```

```typescript
// ✅ With throttler
import { ThrottlerGuard } from '@nestjs/throttler';

@Controller('auth')
@UseGuards(ThrottlerGuard)
export class AuthController {
  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 attempts per minute
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }
}
```

### 4. Role-Based Access Control

```typescript
// ❌ No authorization
@Delete(':id')
deleteUser(@Param('id') id: string) {
  return this.userService.delete(id);
}
```

```typescript
// ✅ With role guard
import { Roles } from './decorators/roles.decorator';
import { RolesGuard } from './guards/roles.guard';

@Delete(':id')
@UseGuards(RolesGuard)
@Roles('admin')
deleteUser(@Param('id') id: string) {
  return this.userService.delete(id);
}
```

### 5. Expose Control

```typescript
// ❌ Entire entity exposed (including passwordHash!)
@Get(':id')
getUser(@Param('id') id: string) {
  return this.userService.findOne(id);
}
```

```typescript
// ✅ Excluded sensitive fields
import { Exclude, Expose } from 'class-transformer';

class UserEntity {
  @Expose()
  id: string;

  @Expose()
  email: string;

  @Exclude()
  passwordHash: string;

  @Exclude()
  internalNotes: string;
}

@Get(':id')
@UseInterceptors(ClassSerializerInterceptor)
getUser(@Param('id') id: string) {
  return this.userService.findOne(id);
}
```

## ESLint Enforcement

```javascript
// eslint.config.js
import nestjsSecurity from 'eslint-plugin-nestjs-security';

export default [nestjsSecurity.configs.recommended];
```

### 5 NestJS Security Rules

| Rule                         | What it catches                        |
| ---------------------------- | -------------------------------------- |
| `require-guards`             | Controllers without @UseGuards         |
| `require-class-validator`    | DTOs without validation decorators     |
| `require-throttler`          | Auth endpoints without rate limiting   |
| `no-exposed-private-fields`  | Entities without @Exclude on sensitive |
| `no-missing-validation-pipe` | @Body without ValidationPipe           |

## Error Messages

```bash
src/user/user.controller.ts
  15:3  error  🔒 CWE-306 | Controller endpoint missing authentication guard
               Risk: Unauthenticated access to protected resource
               Fix: Add @UseGuards(AuthGuard('jwt')) or @Public() decorator

  22:3  error  🔒 CWE-20 | Request body missing validation
               Risk: Malformed input bypasses validation
               Fix: Add @UsePipes(ValidationPipe) and class-validator decorators
```

## Global Configuration

Set up security patterns globally:

```typescript
// main.ts
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strip unknown properties
      forbidNonWhitelisted: true, // Error on unknown properties
      transform: true, // Auto-transform types
    }),
  );

  // Global auth guard (with exceptions for @Public())
  const reflector = app.get(Reflector);
  app.useGlobalGuards(new AuthGuard(reflector));

  await app.listen(3000);
}
```

## Quick Install

{% cta https://npmjs.com/package/eslint-plugin-nestjs-security %}
📦 npm install eslint-plugin-nestjs-security
{% endcta %}

```javascript
import nestjsSecurity from 'eslint-plugin-nestjs-security';
export default [nestjsSecurity.configs.recommended];
```

---

📦 [npm: eslint-plugin-nestjs-security](https://www.npmjs.com/package/eslint-plugin-nestjs-security)
📖 [Full Rule List](https://github.com/ofri-peretz/eslint/tree/main/packages/eslint-plugin-nestjs-security/docs/rules)

{% cta https://github.com/ofri-peretz/eslint %}
⭐ Star on GitHub
{% endcta %}

---

🚀 **How many of your NestJS controllers have guards?**

[GitHub](https://github.com/ofri-peretz) | [LinkedIn](https://linkedin.com/in/ofri-peretz)
