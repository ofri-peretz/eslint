# no-exposed-private-fields

> Detect exposed sensitive fields in DTOs/entities

## Rule Details

This rule detects sensitive fields (like passwords, tokens, secrets) in entity or DTO classes that are not excluded from serialization, which can lead to accidental exposure in API responses.

## OWASP Mapping

- **OWASP Top 10 2021**: A01:2021 - Broken Access Control
- **CWE**: CWE-200 - Exposure of Sensitive Information to an Unauthorized Actor
- **CVSS**: 7.5 (High)

## ❌ Incorrect

```typescript
@Entity()
class User {
  id: string;
  email: string;
  password: string; // Exposed in API responses!
}
```

## ✅ Correct

```typescript
import { Exclude } from 'class-transformer';

@Entity()
class User {
  id: string;
  email: string;

  @Exclude()
  password: string; // Hidden from API responses
}

// Make sure to use ClassSerializerInterceptor
@UseInterceptors(ClassSerializerInterceptor)
@Controller('users')
class UsersController {
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }
}
```

## Options

```typescript
{
  // Skip rule in test files (default: true)
  allowInTests?: boolean;
}
```

## Detected Sensitive Field Names

- `password`, `passwordHash`, `hashedPassword`
- `secret`, `secretKey`, `apiSecret`
- `token`, `accessToken`, `refreshToken`, `authToken`
- `privateKey`, `encryptionKey`
- `ssn`, `socialSecurityNumber`
- `creditCard`, `cardNumber`

## When Not To Use It

- For internal DTOs not used in API responses
- For DTOs that are explicitly mapped before sending to clients
