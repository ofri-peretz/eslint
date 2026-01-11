# eslint-plugin-nestjs-security - Rules Documentation

> Security-focused ESLint rules for NestJS applications

## Overview

This plugin provides security rules specifically designed for NestJS framework applications. The rules detect common security vulnerabilities in NestJS decorators, guards, interceptors, and module configurations.

## Rules (5)

### Authorization & Access Control

| Rule | CWE | OWASP | CVSS | Description | 💼 | ⚠️ | 🔧 | 💡 | 🚫 |
| :--- | :---: | :---: | :---: | :--- | :---: | :---: | :---: | :---: | :---: |
| [`require-guards`](./rules/require-guards.md) | CWE-284 |  |  | Require @UseGuards on controllers |  |  |  |  |  |
| [`no-exposed-private-fields`](./rules/no-exposed-private-fields.md) | CWE-200 |  |  | Detect exposed sensitive fields |  |  |  |  |  |
### Input Validation

| Rule | CWE | OWASP | CVSS | Description | 💼 | ⚠️ | 🔧 | 💡 | 🚫 |
| :--- | :---: | :---: | :---: | :--- | :---: | :---: | :---: | :---: | :---: |
| [`no-missing-validation-pipe`](./rules/no-missing-validation-pipe.md) | CWE-20 |  |  | Require ValidationPipe for DTOs |  |  |  |  |  |
| [`require-class-validator`](./rules/require-class-validator.md) | CWE-20 |  |  | Require class-validator decorators |  |  |  |  |  |
### Rate Limiting

| Rule | CWE | OWASP | CVSS | Description | 💼 | ⚠️ | 🔧 | 💡 | 🚫 |
| :--- | :---: | :---: | :---: | :--- | :---: | :---: | :---: | :---: | :---: |
| [`require-throttler`](./rules/require-throttler.md) | CWE-770 |  |  | Require ThrottlerGuard/rate limit |  |  |  |  |  |
## Quick Start

```javascript
// eslint.config.js
import nestjsSecurity from 'eslint-plugin-nestjs-security';

export default [nestjsSecurity.configs.recommended];
```

## Configuration Options

### Global Configuration Handling

For teams using global configuration in `main.ts`:

```javascript
{
  rules: {
    'nestjs-security/require-guards': ['warn', { assumeGlobalGuards: true }],
    'nestjs-security/no-missing-validation-pipe': ['warn', { assumeGlobalPipes: true }],
    'nestjs-security/require-throttler': ['warn', { assumeGlobalThrottler: true }]
  }
}
```

## Resources

- [NestJS Security Best Practices](https://docs.nestjs.com/security/authentication)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Main README](../README.md)
