# eslint-plugin-nestjs-security - Rules Documentation

> Security-focused ESLint rules for NestJS applications

## Overview

This plugin provides security rules specifically designed for NestJS framework applications. The rules detect common security vulnerabilities in NestJS decorators, guards, interceptors, and module configurations.

## Rules (5)

### Authorization & Access Control

| Rule                                                                | Description                       | CWE     | Status   |
| ------------------------------------------------------------------- | --------------------------------- | ------- | -------- |
| [`require-guards`](./rules/require-guards.md)                       | Require @UseGuards on controllers | CWE-284 | ✅ Ready |
| [`no-exposed-private-fields`](./rules/no-exposed-private-fields.md) | Detect exposed sensitive fields   | CWE-200 | ✅ Ready |

### Input Validation

| Rule                                                                  | Description                        | CWE    | Status   |
| --------------------------------------------------------------------- | ---------------------------------- | ------ | -------- |
| [`no-missing-validation-pipe`](./rules/no-missing-validation-pipe.md) | Require ValidationPipe for DTOs    | CWE-20 | ✅ Ready |
| [`require-class-validator`](./rules/require-class-validator.md)       | Require class-validator decorators | CWE-20 | ✅ Ready |

### Rate Limiting

| Rule                                                | Description                       | CWE     | Status   |
| --------------------------------------------------- | --------------------------------- | ------- | -------- |
| [`require-throttler`](./rules/require-throttler.md) | Require ThrottlerGuard/rate limit | CWE-770 | ✅ Ready |

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
