# no-hardcoded-credentials

> **Keywords:** hardcoded credentials, CWE-798, security, ESLint rule, API keys, passwords, tokens, secrets, environment variables, secret management, OWASP, credential security, auto-fix, LLM-optimized, code security

Detects hardcoded passwords, API keys, tokens, and other sensitive credentials in source code. This rule is part of [`@forge-js/eslint-plugin-llm-optimized`](https://www.npmjs.com/package/@forge-js/eslint-plugin-llm-optimized) and provides LLM-optimized error messages that AI assistants can automatically fix.

⚠️ This rule **_warns_** by default in the `recommended` config.

## Quick Summary

| Aspect            | Details                                                                          |
| ----------------- | -------------------------------------------------------------------------------- |
| **CWE Reference** | CWE-798 (Use of Hard-coded Credentials)                                          |
| **Severity**      | Critical (security vulnerability)                                                |
| **Auto-Fix**      | ✅ Yes (suggests environment variables or secret managers)                       |
| **Category**      | Security                                                                         |
| **ESLint MCP**    | ✅ Optimized for ESLint MCP integration                                          |
| **Best For**      | All applications handling sensitive data, API integrations, database connections |

## Rule Details

Hardcoded credentials are one of the most common security vulnerabilities. This rule detects passwords, API keys, tokens, and other sensitive values that are directly embedded in source code, which can be exposed in version control systems.

### Why This Matters

| Issue                 | Impact                              | Solution                   |
| --------------------- | ----------------------------------- | -------------------------- |
| 🔒 **Security**       | Credentials exposed in git history  | Use environment variables  |
| 🐛 **Data Breach**    | API keys can be stolen from code    | Secret management services |
| 🔐 **Access Control** | Passwords visible to all developers | AWS Secrets Manager, Vault |
| 📊 **Compliance**     | Violates security best practices    | CI/CD secret injection     |

## Detection Patterns

The rule detects:

- **API Keys**: Stripe keys (`sk_live_FAKE_KEY_FOR_TESTING`), GitHub tokens (`ghp_...`), AWS keys (`AKIA...`)
- **JWT Tokens**: Base64-encoded tokens with three parts
- **OAuth Tokens**: GitHub, GitLab, and similar OAuth tokens
- **Passwords**: Common weak passwords (`password`, `admin`, `123456`)
- **Database Strings**: Connection strings with embedded credentials
- **Secret Keys**: Long base64 or hex strings (32+ characters)

## Examples

### ❌ Incorrect

```typescript
// Hardcoded API key
const apiKey = 'sk_live_FAKE_LIVE_KEY_FOR_TESTING_PURPOSES_ONLY_1234567890';

// Hardcoded password
const password = 'admin123';

// Hardcoded JWT token
const token =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

// Database connection string with credentials
const dbUrl = 'mysql://user:password@localhost:3306/dbname';

// AWS access key
const awsKey = 'AKIAIOSFODNN7EXAMPLE';
```

### ✅ Correct

```typescript
// Environment variable
const apiKey = process.env.API_KEY;

// Secret manager
const password = await getSecret('database-password');

// Configuration service
const token = configService.get('JWT_TOKEN');

// Environment variable for database
const dbUrl = process.env.DATABASE_URL;

// AWS SDK with IAM roles (no keys needed)
const s3 = new AWS.S3(); // Uses IAM role
```

## Configuration

```javascript
{
  rules: {
    '@forge-js/llm-optimized/no-hardcoded-credentials': ['error', {
      ignorePatterns: ['^test-'],           // Ignore test credentials
      allowInTests: false,                  // Allow in test files
      minLength: 8,                         // Minimum credential length
      detectApiKeys: true,                  // Detect API keys
      detectPasswords: true,                // Detect passwords
      detectTokens: true,                   // Detect tokens
      detectDatabaseStrings: true          // Detect database strings
    }]
  }
}
```

## Options

| Option                  | Type       | Default | Description                                                       |
| ----------------------- | ---------- | ------- | ----------------------------------------------------------------- |
| `ignorePatterns`        | `string[]` | `[]`    | Regex patterns to ignore (e.g., `['^test-']` for test keys)       |
| `allowInTests`          | `boolean`  | `false` | Allow credentials in test files (`.test.ts`, `.spec.ts`)          |
| `minLength`             | `number`   | `8`     | Minimum length for credential detection (except common passwords) |
| `detectApiKeys`         | `boolean`  | `true`  | Detect API keys (Stripe, AWS, etc.)                               |
| `detectPasswords`       | `boolean`  | `true`  | Detect common weak passwords                                      |
| `detectTokens`          | `boolean`  | `true`  | Detect JWT and OAuth tokens                                       |
| `detectDatabaseStrings` | `boolean`  | `true`  | Detect database connection strings with credentials               |

### Ignoring Test Credentials

```javascript
{
  rules: {
    '@forge-js/llm-optimized/no-hardcoded-credentials': ['error', {
      ignorePatterns: ['^test-', '^mock-', '^fake-']
    }]
  }
}
```

### Allowing Credentials in Test Files

```javascript
{
  rules: {
    '@forge-js/llm-optimized/no-hardcoded-credentials': ['error', {
      allowInTests: true  // Allows credentials in .test.ts and .spec.ts files
    }]
  }
}
```

## Rule Logic Flow

```mermaid
%%{init: {
  'theme': 'base',
  'themeVariables': {
    'primaryColor': '#f8fafc',
    'primaryTextColor': '#1e293b',
    'primaryBorderColor': '#334155',
    'lineColor': '#475569',
    'c0': '#f8fafc',
    'c1': '#f1f5f9',
    'c2': '#e2e8f0',
    'c3': '#cbd5e1'
  }
}}%%
flowchart TD
    A[🔍 String Literal Found] --> B{In Test File?}
    B -->|Yes & allowInTests| C[✅ Skip]
    B -->|No| D{Matches Ignore Pattern?}
    D -->|Yes| C
    D -->|No| E{Check Credential Patterns}
    E --> F{Common Password?}
    F -->|Yes| G[🚨 Report Error]
    F -->|No| H{Database String?}
    H -->|Yes| G
    H -->|No| I{Length >= minLength?}
    I -->|No| C
    I -->|Yes| J{API Key Pattern?}
    J -->|Yes| G
    J -->|No| K{Token Pattern?}
    K -->|Yes| G
    K -->|No| L{Secret Key Pattern?}
    L -->|Yes| G
    L -->|No| C

    G --> M[💡 Suggest Fixes]
    M --> N[Environment Variable]
    M --> O[Secret Manager]

    classDef startNode fill:#f0fdf4,stroke:#16a34a,stroke-width:2px,color:#1f2937
    classDef errorNode fill:#fef2f2,stroke:#dc2626,stroke-width:2px,color:#1f2937
    classDef processNode fill:#eff6ff,stroke:#2563eb,stroke-width:2px,color:#1f2937
    classDef skipNode fill:#f1f5f9,stroke:#64748b,stroke-width:2px,color:#1f2937

    class A startNode
    class G errorNode
    class E,F,H,I,J,K,L processNode
    class C skipNode
```

## Best Practices

### 1. Use Environment Variables

```typescript
// ✅ Good
const apiKey = process.env.STRIPE_API_KEY;
if (!apiKey) {
  throw new Error('STRIPE_API_KEY is required');
}
```

### 2. Use Secret Management Services

```typescript
// ✅ Good - AWS Secrets Manager
import { SecretsManager } from '@aws-sdk/client-secrets-manager';

const client = new SecretsManager({ region: 'us-east-1' });
const secret = await client.getSecretValue({ SecretId: 'api-keys' });
const apiKey = JSON.parse(secret.SecretString).stripeKey;
```

### 3. Use Configuration Services

```typescript
// ✅ Good - Config service
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ApiService {
  constructor(private config: ConfigService) {}

  getApiKey() {
    return this.config.get<string>('API_KEY');
  }
}
```

### 4. Never Commit Credentials

```bash
# ✅ Good - Use .env files (gitignored)
echo "API_KEY=sk_live_FAKE_KEY_FOR_TESTING" >> .env
echo ".env" >> .gitignore
```

## Related Rules

- [`no-sql-injection`](./no-sql-injection.md) - Detects SQL injection vulnerabilities
- [`database-injection`](./database-injection.md) - Comprehensive database security
- [`detect-eval-with-expression`](./detect-eval-with-expression.md) - Code injection detection

## Resources

- [CWE-798: Use of Hard-coded Credentials](https://cwe.mitre.org/data/definitions/798.html)
- [OWASP: Hardcoded Credentials](https://owasp.org/www-community/vulnerabilities/Use_of_hard-coded_cryptographic_key)
- [12 Factor App: Config](https://12factor.net/config)
- [AWS Secrets Manager](https://aws.amazon.com/secrets-manager/)
- [HashiCorp Vault](https://www.vaultproject.io/)

## Version History

- **1.3.0** - Initial release with comprehensive credential detection patterns
