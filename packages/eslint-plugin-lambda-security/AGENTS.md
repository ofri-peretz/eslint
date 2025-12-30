# AGENTS.md

> Context for AI coding agents working on eslint-plugin-lambda-security

## Setup Commands

```bash
# Install dependencies (from monorepo root)
pnpm install

# Build this package
nx build eslint-plugin-lambda-security

# Run tests
nx test eslint-plugin-lambda-security

# Run tests with coverage
nx test eslint-plugin-lambda-security --coverage

# Lint this package
nx lint eslint-plugin-lambda-security
```

## Code Style

- TypeScript strict mode with `@interlace/eslint-devkit` types
- Use `AST_NODE_TYPES` constants, never string literals for node types
- Use `formatLLMMessage()` for all rule error messages
- Include CWE, CVSS, OWASP Serverless Top 10 in every security message
- Use `c8 ignore` comments with documented reasons for untestable code
- Single-pass AST traversal patterns (O(n) complexity)

## Testing Instructions

- Tests use `@typescript-eslint/rule-tester` with Vitest
- Each rule has `index.ts` (implementation) and `*.test.ts` (tests) in same directory
- Run specific rule test: `nx test eslint-plugin-lambda-security --testPathPattern="no-hardcoded-credentials"`
- Coverage target: ≥90% lines, ≥95% functions
- All tests must pass before committing

## Project Structure

```
src/
├── index.ts          # Plugin entry, exports rules and 2 configs
├── types/index.ts    # Exported rule option types
└── rules/            # 5 rule directories
    └── [rule-name]/
        ├── index.ts       # Rule implementation
        └── *.test.ts      # Rule tests
docs/rules/           # Markdown documentation per rule
```

## Plugin Purpose

Security-focused ESLint plugin with **5 rules** for AWS Lambda, Middy, and serverless applications. Covers hardcoded credentials, secrets exposure, environment logging, and CORS misconfigurations.

## Rule Categories

| Category              | Rules                                                                 | CWEs     |
| --------------------- | --------------------------------------------------------------------- | -------- |
| Credentials & Secrets | `no-hardcoded-credentials-sdk`, `no-secrets-in-env`, `no-env-logging` | 532, 798 |
| CORS                  | `no-permissive-cors-response`, `no-permissive-cors-middy`             | 942      |

## AWS SDK Clients Detected

S3Client, DynamoDBClient, LambdaClient, STSClient, SecretsManagerClient, SQSClient, SNSClient, EC2Client, ECSClient, CloudWatchClient, CloudWatchLogsClient, APIGatewayClient, CognitoIdentityClient, CognitoIdentityProviderClient, EventBridgeClient, StepFunctionsClient, RDSClient, ElastiCacheClient

## AWS Access Key Patterns

| Pattern | Type                     |
| ------- | ------------------------ |
| `AKIA*` | IAM user access key      |
| `ASIA*` | STS temporary access key |
| `AIDA*` | IAM user ID              |

## Common Fix Patterns

```typescript
// Hardcoded credentials
// BAD: new S3Client({ credentials: { accessKeyId: 'AKIA...', secretAccessKey: '...' } })
// GOOD: new S3Client({ region: 'us-east-1' })  // Uses Lambda execution role
// GOOD: new S3Client({ credentials: fromNodeProviderChain() })

// Secrets in env
// BAD: process.env.DB_PASSWORD = 'my-secret'
// GOOD: const secret = await client.send(new GetSecretValueCommand({ SecretId: 'my-secret' }))

// Logging env
// BAD: console.log(process.env)
// GOOD: console.log('Region:', process.env.AWS_REGION)

// Lambda CORS
// BAD: return { headers: { 'Access-Control-Allow-Origin': '*' }, ... }
// GOOD: return { headers: { 'Access-Control-Allow-Origin': 'https://your-app.com' }, ... }

// Middy CORS
// BAD: middy(handler).use(httpCors())
// GOOD: middy(handler).use(httpCors({ origins: ['https://your-app.com'] }))
```

## Security Considerations

- All rules map to OWASP Serverless Top 10: SAS-2, SAS-3, SAS-4
- CWE coverage: 532, 798, 942
- Real AWS key pattern detection (not just string length checks)
