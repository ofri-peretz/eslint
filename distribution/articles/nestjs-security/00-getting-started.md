---
title: 'Getting Started with eslint-plugin-nestjs-security'
published: false
description: 'NestJS security in 60 seconds. 5 rules for guards, validation, and rate limiting.'
tags: nestjs, nodejs, security, tutorial
cover_image:
series: Getting Started
---

# Getting Started with eslint-plugin-nestjs-security

**5 NestJS security rules. Guards, validation, throttling.**

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

[GitHub](https://github.com/ofri-peretz) | [LinkedIn](https://linkedin.com/in/ofri-peretz)
