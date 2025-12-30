# Contributing to eslint-plugin-nestjs-security

Thank you for your interest in contributing to `eslint-plugin-nestjs-security`!

## Quick Start

```bash
# Clone the monorepo
git clone https://github.com/ofri-peretz/eslint.git
cd eslint

# Install dependencies
pnpm install

# Build this package
nx build eslint-plugin-nestjs-security

# Run tests
nx test eslint-plugin-nestjs-security

# Run tests with coverage
nx test eslint-plugin-nestjs-security --coverage
```

## Package-Specific Guidelines

### Rule Categories

This plugin focuses on **NestJS-specific** security patterns:

1. **Authorization** - Guards, access control
2. **Input Validation** - ValidationPipe, class-validator
3. **Rate Limiting** - ThrottlerGuard
4. **Serialization** - Exposed sensitive fields

### Rule Structure

Each rule follows this directory structure:

```
src/rules/[rule-name]/
├── index.ts      # Rule implementation
└── index.spec.ts # Tests
```

### Quality Requirements

- **Coverage**: ≥90% line coverage
- **Documentation**: Rule doc in `docs/rules/[rule-name].md`
- **OWASP Mapping**: CWE and OWASP category in error messages
- **LLM-Optimized**: Use `formatLLMMessage()` from eslint-devkit
- **Decorator-Aware**: Detect @UseGuards, @UsePipes, @Throttle, @Exclude

### Global Configuration Handling

NestJS supports global configuration that ESLint cannot detect cross-file:

- `app.useGlobalGuards()` in `main.ts`
- `app.useGlobalPipes()` in `main.ts`
- `ThrottlerModule.forRoot()` in app.module.ts

Rules support `assumeGlobal*` options for teams using global config.

## Full Contributing Guide

For complete contribution guidelines, commit message format, and PR process, see the [main CONTRIBUTING.md](../../CONTRIBUTING.md) in the repository root.

## Related Documentation

- [Quality Standards](../../docs/QUALITY_STANDARDS.md)
- [Plugin Review Workflow](../../docs/PLUGIN-REVIEW-WORKFLOW.md)
