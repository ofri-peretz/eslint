---
title: 'Getting Started with eslint-plugin-lambda-security'
published: false
description: 'AWS Lambda security in 60 seconds. 13 rules for OWASP Serverless Top 10 coverage.'
tags: aws, lambda, serverless, tutorial
cover_image:
series: Getting Started
---

# Getting Started with eslint-plugin-lambda-security

**13 Lambda security rules. OWASP Serverless Top 10. AWS best practices.**

## Quick Install

```bash
npm install --save-dev eslint-plugin-lambda-security
```

## Flat Config

```javascript
// eslint.config.js
import lambdaSecurity from 'eslint-plugin-lambda-security';

export default [lambdaSecurity.configs.recommended];
```

## Rule Overview

| Rule                              | OWASP   | What it catches        |
| --------------------------------- | ------- | ---------------------- |
| `no-unvalidated-event-body`       | S1, S10 | Injection via event    |
| `no-missing-authorization-check`  | S2      | No auth in handlers    |
| `no-exposed-error-details`        | S3      | Stack traces in errors |
| `no-unbounded-batch-processing`   | S4      | Large batch DoS        |
| `no-overly-permissive-iam-policy` | S5      | `*` in IAM             |
| `no-permissive-cors-response`     | S6      | CORS misconfiguration  |
| `no-error-swallowing`             | S7      | Empty catch blocks     |
| `no-secrets-in-env`               | S8      | Secrets in env vars    |
| `no-user-controlled-requests`     | S9      | SSRF                   |
| `no-env-logging`                  | S3      | Env logged             |
| `no-hardcoded-credentials-sdk`    | S8      | AWS creds in code      |
| `no-permissive-cors-middy`        | S6      | Middy CORS             |
| `require-timeout-handling`        | S4      | No timeout fallback    |

## Quick Reference

```bash
# Install
npm install --save-dev eslint-plugin-lambda-security

# Config (eslint.config.js)
import lambdaSecurity from 'eslint-plugin-lambda-security';
export default [lambdaSecurity.configs.recommended];

# Run
npx eslint .
```

---

📦 [npm: eslint-plugin-lambda-security](https://www.npmjs.com/package/eslint-plugin-lambda-security)
📖 [OWASP Serverless Mapping](https://github.com/ofri-peretz/eslint/tree/main/packages/eslint-plugin-lambda-security#owasp-serverless)

{% cta https://github.com/ofri-peretz/eslint %}
⭐ Star on GitHub
{% endcta %}

---

🚀 **Building on Lambda? Run the linter!**

[GitHub](https://github.com/ofri-peretz) | [LinkedIn](https://linkedin.com/in/ofri-peretz)
