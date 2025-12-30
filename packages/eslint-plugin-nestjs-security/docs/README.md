# eslint-plugin-nestjs-security - Rules Documentation

> Security-focused ESLint rules for NestJS applications

## Overview

This plugin provides security rules specifically designed for NestJS framework applications. The rules detect common security vulnerabilities in NestJS decorators, guards, interceptors, and module configurations.

## Status

🚧 **Under Development** - Rules are being implemented. Check back for updates.

## Planned Rules

| Rule                           | Description                                     | Status     |
| ------------------------------ | ----------------------------------------------- | ---------- |
| `require-auth-guard`           | Require authentication guards on controllers    | 📋 Planned |
| `no-permissive-cors-decorator` | Detect `@EnableCors()` with permissive settings | 📋 Planned |
| `require-validation-pipe`      | Require ValidationPipe for DTOs                 | 📋 Planned |
| `no-exposed-entity`            | Prevent exposing database entities directly     | 📋 Planned |
| `require-rate-limit-decorator` | Require rate limiting on endpoints              | 📋 Planned |

## Contributing

Contributions are welcome! See the main repository README for contribution guidelines.

## Resources

- [NestJS Security Best Practices](https://docs.nestjs.com/security/authentication)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
