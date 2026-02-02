# Contributing to eslint-plugin-lambda-security

Thank you for your interest in contributing to `eslint-plugin-lambda-security`!

## Quick Start

```bash
# Clone the monorepo
git clone https://github.com/ofri-peretz/eslint.git
cd eslint

# Install dependencies
npm install

# Build this package
nx build eslint-plugin-lambda-security

# Run tests
nx test eslint-plugin-lambda-security

# Run tests with coverage
nx test eslint-plugin-lambda-security --coverage
```

## Package-Specific Guidelines

### Rule Categories

This plugin focuses on **AWS Lambda/serverless-specific** security:

1. **Credentials** - AWS SDK v3 hardcoded keys
2. **Secrets** - Environment variable exposure
3. **CORS** - Lambda response headers, Middy middleware

### Rule Structure

Each rule follows this directory structure:

```
src/rules/[rule-name]/
├── index.ts      # Rule implementation
└── [rule-name].test.ts  # Tests
```

### Quality Requirements

- **Coverage**: ≥90% line coverage
- **Documentation**: Rule doc in `docs/rules/[rule-name].md`
- **OWASP Mapping**: CWE and OWASP Serverless Top 10 in error messages
- **LLM-Optimized**: Use `formatLLMMessage()` from eslint-devkit
- **AWS-Aware**: Detect AWS SDK v3 clients, Middy middleware

### AWS SDK Detection

Rules detect these AWS SDK v3 client patterns:

- S3Client, DynamoDBClient, LambdaClient, STSClient
- SecretsManagerClient, SQSClient, SNSClient, EC2Client
- CloudWatchClient, APIGatewayClient, CognitoIdentityClient

### Middy Detection

Rules detect @middy/http-cors middleware configuration.

## Full Contributing Guide

For complete contribution guidelines, commit message format, and PR process, see the [main CONTRIBUTING.md](../../CONTRIBUTING.md) in the repository root.

## Related Documentation

- [Quality Standards](../../docs/QUALITY_STANDARDS.md)
- [Plugin Review Workflow](../../docs/PLUGIN-REVIEW-WORKFLOW.md)
