# Contributing to eslint-plugin-express-security

Thank you for your interest in contributing to `eslint-plugin-express-security`!

## Quick Start

```bash
# Clone the monorepo
git clone https://github.com/ofri-peretz/eslint.git
cd eslint

# Install dependencies
pnpm install

# Build this package
nx build eslint-plugin-express-security

# Run tests
nx test eslint-plugin-express-security

# Run tests with coverage
nx test eslint-plugin-express-security --coverage
```

## Package-Specific Guidelines

### Rule Categories

This plugin focuses on **Express.js-specific** security vulnerabilities:

1. **Headers & CORS** - helmet, CORS configuration
2. **CSRF & Cookies** - CSRF protection, cookie attributes
3. **Rate Limiting** - DDoS prevention
4. **GraphQL** - Introspection control
5. **Regex** - ReDoS prevention in routes

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
- **OWASP Mapping**: CWE and OWASP category in error messages
- **LLM-Optimized**: Use `formatLLMMessage()` from eslint-devkit
- **Middleware-Aware**: Detect helmet, cors, csurf, express-rate-limit

## Full Contributing Guide

For complete contribution guidelines, commit message format, and PR process, see the [main CONTRIBUTING.md](../../CONTRIBUTING.md) in the repository root.

## Related Documentation

- [Quality Standards](../../docs/QUALITY_STANDARDS.md)
- [Plugin Review Workflow](../../docs/PLUGIN-REVIEW-WORKFLOW.md)
