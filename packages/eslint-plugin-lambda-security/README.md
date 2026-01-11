# eslint-plugin-lambda-security

<div align="center">
  <img src="https://eslint.interlace.tools/images/interlace-hero.png" alt="ESLint Interlace - eslint-plugin-lambda-security" width="100%" />
</div>

> 🔐 Security-focused ESLint plugin for AWS Lambda and serverless applications. Detects hardcoded credentials, permissive CORS, environment secrets, and logging issues with AI-optimized fix guidance.

[![npm version](https://img.shields.io/npm/v/eslint-plugin-lambda-security.svg)](https://www.npmjs.com/package/eslint-plugin-lambda-security)
[![npm downloads](https://img.shields.io/npm/dm/eslint-plugin-lambda-security.svg)](https://www.npmjs.com/package/eslint-plugin-lambda-security)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![codecov](https://codecov.io/gh/ofri-peretz/eslint/graph/badge.svg?component=lambda_security)](https://app.codecov.io/gh/ofri-peretz/eslint/components?components%5B0%5D=lambda_security)
[![Dec 2025](https://img.shields.io/badge/Dec_2025-blue?logo=rocket&logoColor=white)](https://github.com/ofri-peretz/eslint)

> **Serverless-first security:** This plugin provides security rules for **AWS Lambda**, **Middy.js**, **Serverless Framework**, **AWS SAM**, and **AWS SDK v3**.
> With **5 security rules** mapped to OWASP Serverless Top 10, CWE and CVSS, it transforms your linter into a serverless security auditor that AI assistants can understand and fix.

---

## 💡 What you get

- **Serverless-focused coverage:** 5 rules targeting Lambda-specific vulnerabilities (credentials, CORS, secrets, logging).
- **LLM-optimized & MCP-ready:** Structured 2-line messages with CWE + OWASP + CVSS + concrete fixes so humans _and_ AI auto-fixers stay aligned.
- **Standards aligned:** OWASP Serverless Top 10, CWE tagging, CVSS scoring in every finding for compliance mapping.
- **Tiered presets:** `recommended`, `strict` for fast policy rollout.
- **Framework-aware:** Detects Middy middleware, API Gateway response patterns, AWS SDK v3 clients.
- **Low false positive rate:** Context-aware detection with production heuristics.

Every security rule produces a **structured 2-line error message**:

```bash
src/handlers/api.ts
  18:5   error  🔒 CWE-798 OWASP:SAS-2 CVSS:9.8 | Hardcoded AWS credentials detected | CRITICAL [SOC2,PCI-DSS]
                    Fix: Use credential provider chain or Lambda execution role | https://owasp.org/...
```

**Each message includes:**

- 🔒 **CWE reference** - vulnerability classification
- 📋 **OWASP category** - Serverless Top 10 mapping
- 📊 **CVSS score** - severity rating (0.0-10.0)
- 🏢 **Compliance tags** - affected frameworks (SOC2, PCI-DSS, HIPAA)
- ✅ **Fix instruction** - exact code to write
- 📚 **Documentation link** - learn more

---

## 📊 OWASP Serverless Top 10 Coverage Matrix

| OWASP Category                         | Coverage | Rule | CWE | OWASP | CVSS | Description | 💼 | ⚠️ | 🔧 | 💡 | 🚫 |
| :--- | :---: | :---: | :---: | :--- | :---: | :---: | :---: | :---: | :---: |
| **SAS-1: Injection** |  |  |  |  |  |  |  |  |  |
| **SAS-2: Broken Authentication** |  |  |  |  |  |  |  |  |  |
| **SAS-3: Sensitive Data Exposure** |  |  |  |  |  |  |  |  |  |
| **SAS-4: Security Misconfiguration** |  |  |  |  |  |  |  |  |  |
| **SAS-5: Broken Access Control** |  |  |  |  |  |  |  |  |  |
| **SAS-6: Insufficient Logging** |  |  |  |  |  |  |  |  |  |
| **SAS-7: Denial of Service** |  |  |  |  |  |  |  |  |  |
| **SAS-8: Server-Side Request Forgery** |  |  |  |  |  |  |  |  |  |
| **SAS-9: Functions Misconfiguration** |  |  |  |  |  |  |  |  |  |
| **SAS-10: Improper Crypto** |  |  |  |  |  |  |  |  |  |
---

## 🔐 13 Security Rules

💼 = Set in `recommended` | ⚠️ = Warns in `recommended` | 🔧 = Auto-fixable | 💡 = Suggestions

### Credential & Secrets Protection (3 rules)

| Rule | CWE | OWASP | CVSS | Description | 💼 | ⚠️ | 🔧 | 💡 | 🚫 |
| :--- | :---: | :---: | :---: | :--- | :---: | :---: | :---: | :---: | :---: |
| [no-hardcoded-credentials-sdk](#no-hardcoded-credentials-sdk) | CWE-798 | SAS-2 | 9.8 | Hardcoded AWS credentials in SDK v3 clients | 💼 |  |  |  |  |
| [no-secrets-in-env](#no-secrets-in-env) | CWE-798 | SAS-3 | 9.8 | Secrets hardcoded in environment variables | 💼 |  |  |  |  |
| [no-env-logging](#no-env-logging) | CWE-532 | SAS-3 | 7.5 | Logging entire `process.env` object |  | ⚠️ |  |  |  |
### CORS Security (2 rules)

| Rule | CWE | OWASP | CVSS | Description | 💼 | ⚠️ | 🔧 | 💡 | 🚫 |
| :--- | :---: | :---: | :---: | :--- | :---: | :---: | :---: | :---: | :---: |
| [no-permissive-cors-response](#no-permissive-cors-response) | CWE-942 | SAS-4 | 9.1 | Wildcard CORS in Lambda response headers | 💼 |  | 🔧 |  |  |
| [no-permissive-cors-middy](#no-permissive-cors-middy) | CWE-942 | SAS-4 | 9.1 | Permissive CORS in @middy/http-cors middleware | 💼 |  |  |  |  |
### Input Validation & Access Control (4 rules)

| Rule | CWE | OWASP | CVSS | Description | 💼 | ⚠️ | 🔧 | 💡 | 🚫 |
| :--- | :---: | :---: | :---: | :--- | :---: | :---: | :---: | :---: | :---: |
| no-unvalidated-event-body | CWE-20 | SAS-1 | 8.0 | Lambda handlers using event body without validation |  | ⚠️ |  | 💡 |  |
| no-missing-authorization-check | CWE-862 | SAS-5 | 7.5 | Lambda handlers without authorization checks |  | ⚠️ |  | 💡 |  |
| no-overly-permissive-iam-policy | CWE-732 | SAS-5 | 6.5 | IAM policies with wildcard permissions | 💼 |  |  | 💡 |  |
| no-user-controlled-requests | CWE-918 | SAS-8 | 9.1 | HTTP requests with user-controlled URLs (SSRF) | 💼 |  |  | 💡 |  |
### Security Operations (4 rules)

| Rule | CWE | OWASP | CVSS | Description | 💼 | ⚠️ | 🔧 | 💡 | 🚫 |
| :--- | :---: | :---: | :---: | :--- | :---: | :---: | :---: | :---: | :---: |
| no-error-swallowing | CWE-390 | SAS-6 | 5.0 | Empty catch blocks and missing error logging |  | ⚠️ |  | 💡 |  |
| require-timeout-handling | CWE-400 | SAS-7 | 6.0 | External calls without timeout handling |  | ⚠️ |  | 💡 |  |
| no-unbounded-batch-processing | CWE-770 | SAS-7 | 5.5 | Processing batch records without size limits |  | ⚠️ |  | 💡 |  |
| no-exposed-error-details | CWE-209 | SAS-9 | 4.3 | Exposing internal error details in responses |  | ⚠️ |  | 💡 |  |
---

## 🔍 Rule Details

### `no-hardcoded-credentials-sdk`

Detects hardcoded AWS credentials in AWS SDK v3 client configurations.

**❌ Incorrect**

```javascript
// Hardcoded credentials - NEVER do this!
const client = new S3Client({
  credentials: {
    accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
    secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
  },
});
```

**✅ Correct**

```javascript
// Use credential provider chain
import { fromNodeProviderChain } from '@aws-sdk/credential-providers';

const client = new S3Client({
  credentials: fromNodeProviderChain(),
});

// Or let SDK use default chain (recommended for Lambda)
const client = new S3Client({ region: 'us-east-1' });
```

**Detection Patterns:**

- Real AWS access key patterns (AKIA*, ASIA*)
- Secret access keys with 20+ characters
- Session tokens with 15+ characters
- Template literal credential construction

---

### `no-permissive-cors-response`

Detects wildcard CORS (`Access-Control-Allow-Origin: '*'`) in Lambda response headers.

**❌ Incorrect**

```javascript
return {
  statusCode: 200,
  headers: { 'Access-Control-Allow-Origin': '*' },
  body: JSON.stringify(data),
};
```

**✅ Correct**

```javascript
return {
  statusCode: 200,
  headers: { 'Access-Control-Allow-Origin': 'https://your-app.com' },
  body: JSON.stringify(data),
};

// Or use dynamic origin from request
return {
  statusCode: 200,
  headers: { 'Access-Control-Allow-Origin': event.headers.origin },
  body: JSON.stringify(data),
};
```

---

### `no-permissive-cors-middy`

Detects permissive CORS configuration in Middy http-cors middleware.

**❌ Incorrect**

```javascript
// Default is permissive!
middy(handler).use(httpCors());

// Explicit wildcard
middy(handler).use(httpCors({ origin: '*' }));
```

**✅ Correct**

```javascript
middy(handler).use(
  httpCors({
    origins: ['https://your-app.com', 'https://app.your-domain.com'],
  }),
);
```

---

### `no-secrets-in-env`

Detects secrets hardcoded in environment variable assignments.

**❌ Incorrect**

```javascript
process.env.DB_PASSWORD = 'my-secret-password-12345';

const envConfig = {
  API_KEY: 'sk-1234567890abcdef1234567890abcdef',
};
```

**✅ Correct**

```javascript
// Read from process.env (populated by Lambda)
const password = process.env.DB_PASSWORD;

// Use AWS Secrets Manager
import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from '@aws-sdk/client-secrets-manager';

const secret = await client.send(
  new GetSecretValueCommand({ SecretId: 'my-secret' }),
);
```

---

### `no-env-logging`

Detects logging of the entire `process.env` object, which may expose secrets.

**❌ Incorrect**

```javascript
console.log(process.env);
console.log(JSON.stringify(process.env));
logger.info(process.env);
```

**✅ Correct**

```javascript
// Log specific, non-sensitive values
console.log('Region:', process.env.AWS_REGION);
console.log('Environment:', process.env.NODE_ENV);
```

---

## 🚀 Quick Start

### ESLint Flat Config (Recommended)

```javascript
// eslint.config.js
import lambdaSecurity from 'eslint-plugin-lambda-security';

export default [
  lambdaSecurity.configs.recommended,
  // ... other configs
];
```

### Strict Mode

```javascript
import lambdaSecurity from 'eslint-plugin-lambda-security';

export default [lambdaSecurity.configs.strict];
```

---

## 📋 Available Presets

| Preset            | Description                                                            |
| ----------------- | ---------------------------------------------------------------------- |
| **`recommended`** | Balanced security for Lambda projects (critical as error, others warn) |
| **`strict`**      | Maximum security enforcement (all rules as errors)                     |

---

## ⚙️ Configuration Options

All rules accept these common options:

```javascript
{
  rules: {
    'lambda-security/no-hardcoded-credentials-sdk': ['error', {
      allowInTests: true // Default: true - skip test files
    }],
    'lambda-security/no-secrets-in-env': ['error', {
      allowInTests: true,
      additionalPatterns: ['CUSTOM_SECRET_*'] // Additional patterns to detect
    }]
  }
}
```

---

## 🏢 Enterprise Integration Example

```javascript
// eslint.config.js
import lambdaSecurity from 'eslint-plugin-lambda-security';

export default [
  // Baseline for all Lambda functions
  lambdaSecurity.configs.recommended,

  // Strict mode for payment/auth handlers
  {
    files: ['functions/payments/**', 'functions/auth/**'],
    ...lambdaSecurity.configs.strict,
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
| [`eslint-plugin-nestjs-security`](https://www.npmjs.com/package/eslint-plugin-nestjs-security) |  |  |  |  |  |  |  |  |  |
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
